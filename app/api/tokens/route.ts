import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { broadcastLMSEvent } from "@/lib/events";
import { getBundles } from "@/lib/bundles";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    let wallet = await prisma.tokenWallet.findUnique({
      where: { userId: auth.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: {
          userId: auth.user.id,
          balance: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    const academicLevel = (auth.user as any).academicLevel === "OL" || auth.user.headline?.includes("O/L") || auth.user.headline?.includes("IGCSE") ? "OL" : "AL";

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      transactions: wallet.transactions,
      packages: await getBundles(),
      academicLevel,
    });
  } catch (error: any) {
    console.error("Token API GET error:", error);
    return NextResponse.json({ error: "Failed to fetch token balance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { action } = body;

    let wallet = await prisma.tokenWallet.findUnique({
      where: { userId: auth.user.id },
    });

    if (!wallet) {
      wallet = await prisma.tokenWallet.create({
        data: {
          userId: auth.user.id,
          balance: 0,
        },
      });
    }

    if (action === "purchase_tokens") {
      const { packageId, customAmount } = body;
      let tokensToAdd = 0;
      let description = "Purchased Token Hours";

      const selectedPack = (await getBundles()).find((p) => p.id === packageId);
      if (selectedPack) {
        tokensToAdd = selectedPack.tokens;
        description = `Purchased ${selectedPack.name} (${tokensToAdd} Hours Credit)`;
      } else if (customAmount && Number(customAmount) > 0) {
        tokensToAdd = parseInt(customAmount, 10);
        description = `Purchased Custom ${tokensToAdd} Hours Token Pack`;
      } else {
        return NextResponse.json({ error: "Invalid token package selected." }, { status: 400 });
      }

      const updatedWallet = await prisma.$transaction(async (tx) => {
        const w = await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: tokensToAdd },
          },
        });

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: tokensToAdd,
            type: "PURCHASE",
            description,
          },
        });

        return w;
      });

      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: auth.user.id });

      return NextResponse.json({
        success: true,
        message: `Successfully credited ${tokensToAdd} hours to your academic wallet!`,
        balance: updatedWallet.balance,
      });
    }

    if (action === "spend_tokens") {
      const { hoursToSpend, description, referenceId } = body;
      const amount = parseInt(hoursToSpend, 10) || 1;

      if (amount <= 0) {
        return NextResponse.json({ error: "Spend amount must be at least 1 hour/token." }, { status: 400 });
      }

      if (wallet.balance < amount) {
        return NextResponse.json(
          {
            error: `Insufficient token balance. You have ${wallet.balance} hours available, but ${amount} hours required.`,
            required: amount,
            available: wallet.balance,
          },
          { status: 400 }
        );
      }

      const updatedWallet = await prisma.$transaction(async (tx) => {
        const w = await tx.tokenWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
          },
        });

        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -amount,
            type: "SPEND",
            description: description || `Allocated ${amount} Hours for Academic Tutoring`,
            referenceId: referenceId || null,
          },
        });

        return w;
      });

      broadcastLMSEvent("NOTIFICATIONS_CHANGED", { userId: auth.user.id });

      return NextResponse.json({
        success: true,
        message: `Successfully allocated ${amount} hour(s)! Remaining balance: ${updatedWallet.balance} hours.`,
        balance: updatedWallet.balance,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Token API POST error:", error);
    return NextResponse.json({ error: "Failed to process token operation." }, { status: 500 });
  }
}
