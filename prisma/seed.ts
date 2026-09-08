import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Role, CourseLevel, CourseStatus, EventType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { getBundles, saveBundles, DEFAULT_BUNDLES } from "../lib/bundles";

async function main() {
  console.log("🌱 Seeding London A/L & O/L LMS Database with 1 Admin, 1 Tutor, and 1 Student...");

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminName = process.env.DEFAULT_ADMIN_NAME?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Missing required environment variables: DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be configured in .env."
    );
  }

  // Upsert the 3 default accounts without deleting existing user data

  const adminPassHash = hashPassword(adminPassword);
  const tutorPassHash = hashPassword("TutorPass123!");
  const studentPassHash = hashPassword("StudentPass123!");

  const now = new Date();

  // 1. Single Admin Account
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName || "Administrator",
      passwordHash: adminPassHash,
      role: Role.ADMIN,
      emailVerified: now,
      headline: "System Administrator",
      bio: "Managing EduPulse platform curriculum, courses, users, and operations.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    create: {
      email: adminEmail,
      name: adminName || "Administrator",
      passwordHash: adminPassHash,
      role: Role.ADMIN,
      emailVerified: now,
      headline: "System Administrator",
      bio: "Managing EduPulse platform curriculum, courses, users, and operations.",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  // 2. Single Tutor Account
  const tutorUser = await prisma.user.upsert({
    where: { email: "tutor@edupulse.uk" },
    update: {
      name: "Dr. Sarah Jenkins",
      passwordHash: tutorPassHash,
      role: Role.TUTOR,
      emailVerified: now,
      headline: "Senior Faculty Tutor in Pure Mathematics & Sciences",
      bio: "Subject Lead for IAL Pure Mathematics (P1-P4), Mechanics, and Sciences with 18+ years of academic teaching experience.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    create: {
      email: "tutor@edupulse.uk",
      name: "Dr. Sarah Jenkins",
      passwordHash: tutorPassHash,
      role: Role.TUTOR,
      emailVerified: now,
      headline: "Senior Faculty Tutor in Pure Mathematics & Sciences",
      bio: "Subject Lead for IAL Pure Mathematics (P1-P4), Mechanics, and Sciences with 18+ years of academic teaching experience.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
  });

  // 3. Single Student Account
  const studentUser = await prisma.user.upsert({
    where: { email: "student@edupulse.uk" },
    update: {
      name: "S.Y.T. Perera",
      passwordHash: studentPassHash,
      role: Role.STUDENT,
      emailVerified: now,
      phone: "+44 7700 900142",
      headline: "London A/L Mathematics & Science Student",
      bio: "Enrolled in Pure Mathematics (P1-P4), Physics, and Chemistry.",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    },
    create: {
      email: "student@edupulse.uk",
      name: "S.Y.T. Perera",
      passwordHash: studentPassHash,
      role: Role.STUDENT,
      emailVerified: now,
      phone: "+44 7700 900142",
      headline: "London A/L Mathematics & Science Student",
      bio: "Enrolled in Pure Mathematics (P1-P4), Physics, and Chemistry.",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    },
  });

  // Initialize Token Wallet for student (1 Token = 1 Hour)
  const existingWallet = await prisma.tokenWallet.findUnique({
    where: { userId: studentUser.id },
  });

  if (existingWallet) {
    await prisma.tokenTransaction.deleteMany({
      where: { walletId: existingWallet.id },
    });
  }

  await prisma.tokenWallet.upsert({
    where: { userId: studentUser.id },
    update: {
      balance: 18,
      transactions: {
        create: [
          {
            amount: 24,
            type: "PURCHASE",
            description: "Purchased 24 Hours Mastery Vault (24 Tokens — 1 Token = 1H)",
          },
          {
            amount: -4,
            type: "SPEND",
            description: "Allocated 4 Hours (4 Tokens) to 1-on-1 Pure Mathematics Tutoring",
          },
          {
            amount: -2,
            type: "SPEND",
            description: "Allocated 2 Hours (2 Tokens) to Live Masterclass: Pure Mathematics P3 Integration",
          },
        ],
      },
    },
    create: {
      userId: studentUser.id,
      balance: 18,
      transactions: {
        create: [
          {
            amount: 24,
            type: "PURCHASE",
            description: "Purchased 24 Hours Mastery Vault (24 Tokens — 1 Token = 1H)",
          },
          {
            amount: -4,
            type: "SPEND",
            description: "Allocated 4 Hours (4 Tokens) to 1-on-1 Pure Mathematics Tutoring",
          },
          {
            amount: -2,
            type: "SPEND",
            description: "Allocated 2 Hours (2 Tokens) to Live Masterclass: Pure Mathematics P3 Integration",
          },
        ],
      },
    },
  });

  console.log("✅ Exactly 3 Test Users Initialized:");
  console.log("   👑 Admin:   admin@edupulse.uk   / AdminPass123!");
  console.log("   🎓 Tutor:   tutor@edupulse.uk   / TutorPass123!");
  console.log("   📚 Student: student@edupulse.uk / StudentPass123! (Balance: 18 Tokens = 18 Hours)");

  // 4. Update all courses to belong to the single Tutor
  await prisma.course.updateMany({
    data: {
      tutorId: tutorUser.id,
    },
  });

  // 5. Seed Complete London A/L and O/L Course Matrix (1 Token = 1 Hour)
  const coursesData = [
    {
      title: "London A/L Pure Mathematics (P1, P2, P3, P4 & Mechanics M1)",
      slug: "edexcel-ial-pure-mathematics-mechanics",
      subtitle: "Complete specification coverage, calculus proofs, vectors, and Mechanics M1 problem solving.",
      description: "Comprehensive preparation for International Advanced Level Pure Mathematics. Covers P1-P4, integration by parts, parametric equations, differential equations, and kinematics.",
      category: "School of Mathematics & Computing",
      subjectCode: "WMA11-14 / WME01",
      price: 6.0,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      featured: true,
      thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80",
      tutorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: Pure Mathematics 1 & 2 (Algebra, Trigonometry & Calculus)",
          position: 1,
          lessons: [
            { title: "P1: Algebraic Division, Factor Theorem & Coordinate Geometry", durationMin: 35, position: 1, isFreePreview: true },
            { title: "P2: Differentiation, Integration & Trigonometric Proofs", durationMin: 45, position: 2, isFreePreview: true },
            { title: "P2: Exponentials & Logarithmic Modeling", durationMin: 40, position: 3, isFreePreview: false },
          ],
        },
        {
          title: "Module 2: Pure Mathematics 3 & 4 (Advanced Integration & Vectors)",
          position: 2,
          lessons: [
            { title: "P3: Composite Functions, Modulus Graphs & Series Expansion", durationMin: 40, position: 1, isFreePreview: false },
            { title: "P4: Parametric Equations, Integration by Parts & Partial Fractions", durationMin: 50, position: 2, isFreePreview: false },
            { title: "P4: Vector Lines & Dot Product Geometry in 3D", durationMin: 45, position: 3, isFreePreview: false },
          ],
        },
        {
          title: "Module 3: Mechanics M1 & Statistical Modelling",
          position: 3,
          lessons: [
            { title: "M1: Kinematics & Newton's Laws on Inclined Friction Planes", durationMin: 45, position: 1, isFreePreview: false },
            { title: "M1: Connected Particles, Pulleys & Moments of Forces", durationMin: 40, position: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      title: "London A/L Physics (Units 1 to 6 Theory & Virtual Laboratory)",
      slug: "edexcel-ial-physics-unit-1-to-6",
      subtitle: "Mechanics, Electric Circuits, Fields, Particle Physics, and Practical Video Demonstrations.",
      description: "Master all 6 units of International Advanced Level Physics with step-by-step lecture walkthroughs and experimental lab demonstrations.",
      category: "School of Computing & Engineering",
      subjectCode: "WPH11-16",
      price: 5.0,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      featured: true,
      thumbnail: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80",
      instructorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: Unit 1 & 2 (Mechanics, Materials, Waves & Electricity)",
          position: 1,
          lessons: [
            { title: "Unit 1: Kinematics, Dynamics & Fluid Flow Viscosity", durationMin: 40, position: 1, isFreePreview: true },
            { title: "Unit 2: Wave Particle Duality, Photons & Circuit EMF", durationMin: 42, position: 2, isFreePreview: true },
            { title: "Unit 3: Core Practical Lab 1-4 Analysis & Error Calculations", durationMin: 35, position: 3, isFreePreview: false },
          ],
        },
        {
          title: "Module 2: Unit 4 & 5 (Fields, Nuclear Radiation & Thermodynamics)",
          position: 2,
          lessons: [
            { title: "Unit 4: Circular Motion, Momentum & Electric Fields", durationMin: 48, position: 1, isFreePreview: false },
            { title: "Unit 5: Nuclear Decay, Oscillations & Astrophysics", durationMin: 52, position: 2, isFreePreview: false },
            { title: "Unit 6: Synoptic Practical Assessment & Graph Uncertainties", durationMin: 45, position: 3, isFreePreview: false },
          ],
        },
      ],
    },
    {
      title: "London A/L Chemistry (Units 1 to 6 Physical, Inorganic & Organic)",
      slug: "edexcel-ial-chemistry-unit-1-to-6",
      subtitle: "Atomic structure, reaction kinetics, equilibrium, organic synthesis, and spectroscopic identification.",
      description: "Comprehensive unit-by-unit masterclass covering thermodynamic cycles, redox titrations, transition metals, organic reaction mechanisms, and NMR spectra.",
      category: "School of Science & O/L Academy",
      subjectCode: "WCH11-16",
      price: 4.0,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      featured: true,
      thumbnail: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80",
      instructorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: Unit 1 & 2 (Atomic Structure, Bonding & Organic Intro)",
          position: 1,
          lessons: [
            { title: "Unit 1: Mass Spectrometry, Ionization Energies & Periodic Trends", durationMin: 38, position: 1, isFreePreview: true },
            { title: "Unit 2: Intermolecular Forces, Alcohols & Halogenoalkanes", durationMin: 42, position: 2, isFreePreview: true },
          ],
        },
        {
          title: "Module 2: Unit 4 & 5 (Kinetics, Acid-Base & Organic Synthesis)",
          position: 2,
          lessons: [
            { title: "Unit 4: Rate Equations, Arrhenius Plots & pH Buffer Titrations", durationMin: 50, position: 1, isFreePreview: false },
            { title: "Unit 5: Transition Metals, Ligand Exchange & Redox Electrochemistry", durationMin: 55, position: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      title: "Economics & Business Studies Advanced Masterclass",
      slug: "edexcel-cambridge-economics-business",
      subtitle: "Microeconomics market structures, macro policy evaluation, business strategies, and essay structuring.",
      description: "Master evaluation essays, elasticity calculations, monetary/fiscal policy data analysis, and competitive business strategies.",
      category: "School of Economics & Commerce",
      subjectCode: "WEC11-14 / 9708",
      price: 3.0,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      featured: false,
      thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
      instructorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: Microeconomic Markets & Market Failure",
          position: 1,
          lessons: [
            { title: "Price Elasticities, Consumer Surplus & Externalities", durationMin: 35, position: 1, isFreePreview: true },
            { title: "Market Structures: Monopoly, Oligopoly & Game Theory", durationMin: 45, position: 2, isFreePreview: false },
          ],
        },
        {
          title: "Module 2: Macroeconomic Performance & Global Trade",
          position: 2,
          lessons: [
            { title: "Inflation, Unemployment & Balance of Payments Equilibrium", durationMin: 40, position: 1, isFreePreview: false },
            { title: "Exchange Rates, Protectionism & International Competitiveness", durationMin: 45, position: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      title: "London O/L (IGCSE) Mathematics & Science Foundation",
      slug: "cambridge-edexcel-igcse-maths-science",
      subtitle: "Targeting Grade 9/8 (A*) with structured unit-by-unit topic breakdowns and problem solving.",
      description: "A complete masterclass for London O/L (IGCSE) students covering foundation mathematics, mechanics, waves, and stoichiometry.",
      category: "School of Science & O/L Academy",
      subjectCode: "4MA1 / 0580",
      price: 3.0,
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      featured: true,
      thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
      instructorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: IGCSE Mathematics Paper 1H & 2H Mastery",
          position: 1,
          lessons: [
            { title: "Algebraic Manipulation, Simultaneous Equations & Geometry", durationMin: 30, position: 1, isFreePreview: true },
            { title: "Trigonometric Functions, Bearings & Probability Trees", durationMin: 35, position: 2, isFreePreview: true },
          ],
        },
        {
          title: "Module 2: IGCSE Science Core Foundations",
          position: 2,
          lessons: [
            { title: "Physics: Velocity Time Graphs & Circuit Laws", durationMin: 30, position: 1, isFreePreview: false },
            { title: "Chemistry: Moles, Periodic Table & Electrolysis", durationMin: 35, position: 2, isFreePreview: false },
          ],
        },
      ],
    },
    {
      title: "London A/L Biology (Units 1 to 6 Cellular & Environmental Sciences)",
      slug: "edexcel-ial-biology-units-1-to-6",
      subtitle: "Cell biology, genetics, physiology, microbiology, biochemistry, and ecological systems.",
      description: "Complete syllabus coverage of cellular biology, enzyme kinetics, photosynthesis, cellular respiration, nervous coordination, and gene technology.",
      category: "School of Science & O/L Academy",
      subjectCode: "WBI11-16",
      price: 3.0,
      level: CourseLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      featured: false,
      thumbnail: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
      instructorId: tutorUser.id,
      modules: [
        {
          title: "Module 1: Molecules, Cells & Health",
          position: 1,
          lessons: [
            { title: "Biological Macromolecules: Lipids, Carbohydrates & Proteins", durationMin: 35, position: 1, isFreePreview: true },
            { title: "Membrane Transport, Water Potential & Enzyme Action", durationMin: 40, position: 2, isFreePreview: true },
          ],
        },
        {
          title: "Module 2: Energy, Environment & Microbiology",
          position: 2,
          lessons: [
            { title: "Photosynthesis: Light Dependent Reactions & Calvin Cycle", durationMin: 45, position: 1, isFreePreview: false },
            { title: "Microbiology Techniques, PCR & Forensic DNA Profiling", durationMin: 45, position: 2, isFreePreview: false },
          ],
        },
      ],
    },
  ];

  for (const cData of coursesData) {
    const existing = await prisma.course.findUnique({ where: { slug: cData.slug } });
    let course;
    if (!existing) {
      course = await prisma.course.create({
        data: {
          title: cData.title,
          slug: cData.slug,
          subtitle: cData.subtitle,
          description: cData.description,
          category: cData.category,
          subjectCode: cData.subjectCode,
          price: cData.price,
          level: cData.level,
          status: cData.status,
          featured: cData.featured,
          thumbnail: cData.thumbnail,
          tutorId: tutorUser.id,
          modules: {
            create: cData.modules.map((m) => ({
              title: m.title,
              position: m.position,
              lessons: {
                create: m.lessons.map((l) => ({
                  title: l.title,
                  durationMin: l.durationMin,
                  position: l.position,
                  isFreePreview: l.isFreePreview,
                })),
              },
            })),
          },
        },
      });
      console.log(`✅ Seeded Course: ${course.title} (${course.price} Tokens = ${course.price}H)`);
    } else {
      course = await prisma.course.update({
        where: { id: existing.id },
        data: {
          title: cData.title,
          subtitle: cData.subtitle,
          description: cData.description,
          category: cData.category,
          subjectCode: cData.subjectCode,
          price: cData.price,
          level: cData.level,
          status: cData.status,
          featured: cData.featured,
          thumbnail: cData.thumbnail,
          tutorId: tutorUser.id,
        },
      });
      console.log(`🔄 Updated Course: ${course.title} (${course.price} Tokens = ${course.price}H)`);
    }

    // Enroll our 1 student in the course
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: studentUser.id,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId: studentUser.id,
        courseId: course.id,
        enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 6. Seed Course Study Materials & Handbooks
  await prisma.courseMaterial.deleteMany({});
  const allSeededCourses = await prisma.course.findMany();
  for (const c of allSeededCourses) {
    if (c.slug.includes("mathematics")) {
      await prisma.courseMaterial.createMany({
        data: [
          {
            title: "Pure Mathematics P3 Comprehensive Integration Handbook",
            description: "Step-by-step proofs for integration by parts, partial fractions, and trigonometric substitutions.",
            fileUrl: "/api/files/public/Pure_Maths_P3_Formula_Handbook_2026.pdf",
            fileSize: "3.4 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
          {
            title: "Official Edexcel IAL Mathematics Formula Book & Tables",
            description: "Full formula specifications, standard integrals, trigonometric identities, and statistical tables.",
            fileUrl: "/api/files/public/Maths_Formula_Book_IAL.pdf",
            fileSize: "1.8 MB",
            fileType: "application/pdf",
            category: "FORMULA_SHEET",
            courseId: c.id,
          },
          {
            title: "IAL Pure Mathematics P1-P4 Worked Practice Solutions",
            description: "Complete exemplar solutions and comprehensive step-by-step guidance.",
            fileUrl: "/api/files/public/Pure_Maths_Past_Paper_Solutions.pdf",
            fileSize: "5.2 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
          {
            title: "Mechanics M1 Kinematics & Statics Problem Set",
            description: "Vectors, Newton's laws of motion, friction on inclined planes, and moments.",
            fileUrl: "/api/files/public/Mechanics_M1_Problems.pdf",
            fileSize: "2.1 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
        ],
      });
    } else if (c.slug.includes("physics")) {
      await prisma.courseMaterial.createMany({
        data: [
          {
            title: "Unit 4 Electric & Magnetic Fields Complete Derivations",
            description: "Electric potential gradients, capacitance calculations, and Faraday/Lenz law derivations.",
            fileUrl: "/api/files/public/Physics_Unit4_Fields_Derivations.pdf",
            fileSize: "2.9 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
          {
            title: "IAL Physics Virtual Practical Guide & Error Analysis",
            description: "Uncertainty calculations, percentage errors, calibration curves, and Unit 6 experimental methods.",
            fileUrl: "/api/files/public/Physics_Lab_Practical_Guide.pdf",
            fileSize: "4.1 MB",
            fileType: "application/pdf",
            category: "LAB_GUIDE",
            courseId: c.id,
          },
          {
            title: "Physics Unit 1-6 Essential Equations Reference Sheet",
            description: "All definitions, SI unit conversions, gravitational constants, and harmonic motion formulas.",
            fileUrl: "/api/files/public/Physics_Equations_Sheet.pdf",
            fileSize: "1.2 MB",
            fileType: "application/pdf",
            category: "FORMULA_SHEET",
            courseId: c.id,
          },
        ],
      });
    } else if (c.slug.includes("chemistry")) {
      await prisma.courseMaterial.createMany({
        data: [
          {
            title: "Synthetic Organic Reaction Pathways & Mechanisms Map",
            description: "Nucleophilic addition, electrophilic substitution, optical isomerism, and reaction schemes.",
            fileUrl: "/api/files/public/Organic_Chemistry_Mechanisms_Map.pdf",
            fileSize: "3.1 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
          {
            title: "Acid-Base Equilibria & Buffer Solution Calculations",
            description: "pH calculations, Ka/pKa expressions, buffer actions, and titration curve analysis.",
            fileUrl: "/api/files/public/Chemistry_Acid_Base_Calculations.pdf",
            fileSize: "2.6 MB",
            fileType: "application/pdf",
            category: "MOCK_PAPER",
            courseId: c.id,
          },
          {
            title: "Qualitative Analysis & Organic Functional Group Tests",
            description: "Precipitate observations, flame tests, infrared spectroscopy, and mass spectrometry guide.",
            fileUrl: "/api/files/public/Chemistry_Qualitative_Analysis_Guide.pdf",
            fileSize: "2.1 MB",
            fileType: "application/pdf",
            category: "LAB_GUIDE",
            courseId: c.id,
          },
        ],
      });
    } else {
      await prisma.courseMaterial.createMany({
        data: [
          {
            title: `${c.title} - Complete Unit Syllabus Guide & Notes`,
            description: "Comprehensive notes covering all core syllabus learning outcomes and specification units.",
            fileUrl: "/api/files/public/Unit_Syllabus_Guide.pdf",
            fileSize: "3.5 MB",
            fileType: "application/pdf",
            category: "HANDOUT",
            courseId: c.id,
          },
          {
            title: `${c.title} - Essential Formula & Reference Sheet`,
            description: "Key definitions, formulas, terms, and faculty guidance.",
            fileUrl: "/api/files/public/Formula_Reference_Sheet.pdf",
            fileSize: "1.5 MB",
            fileType: "application/pdf",
            category: "FORMULA_SHEET",
            courseId: c.id,
          },
        ],
      });
    }
  }

  // 7. Seed Timeline Events & Live Seminars
  const mathCourse = await prisma.course.findFirst({ where: { slug: "edexcel-ial-pure-mathematics-mechanics" } });
  const physicsCourse = await prisma.course.findFirst({ where: { slug: "edexcel-ial-physics-unit-1-to-6" } });

  await prisma.event.deleteMany({}); // clear old events

  if (mathCourse) {
    await prisma.event.create({
      data: {
        title: "Live Masterclass: Pure Mathematics P3 Integration by Parts & Proofs (2H)",
        description: "Interactive live theory masterclass and worked mathematical proofs (2 Hours / 2 Tokens).\n\nClassroom Link: https://meet.google.com/edp-math-p3m",
        meetingLink: "https://meet.google.com/edp-math-p3m",
        type: EventType.LIVE_SEMINAR,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        courseId: mathCourse.id,
        userId: tutorUser.id,
      },
    });

    await prisma.event.create({
      data: {
        title: "Virtual Workshop: Pure Mathematics P4 Differential Calculus (1H)",
        description: "Interactive problem-solving workshop on pure mathematical methods (1 Hour / 1 Token).",
        type: EventType.DEADLINE,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        courseId: mathCourse.id,
        userId: studentUser.id,
      },
    });
  }

  if (physicsCourse) {
    await prisma.event.create({
      data: {
        title: "Live Lecture: Physics Unit 4 Circular Motion & Magnetic Fields (2H)",
        description: "Theory walkthrough and virtual experimental calculations (2 Hours / 2 Tokens).\n\nClassroom Link: https://meet.google.com/edp-phys-u4m",
        meetingLink: "https://meet.google.com/edp-phys-u4m",
        type: EventType.LIVE_SEMINAR,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        courseId: physicsCourse.id,
        userId: tutorUser.id,
      },
    });
  }

  // 8. Seed Private Files
  await prisma.privateFile.deleteMany({});
  await prisma.privateFile.createMany({
    data: [
      {
        fileName: "Pure_Maths_P3_Formula_Handbook_2026.pdf",
        fileSize: "2.4 MB",
        fileType: "application/pdf",
        userId: studentUser.id,
      },
      {
        fileName: "Physics_Unit2_Circuit_EMF_Summary_Notes.pdf",
        fileSize: "1.8 MB",
        fileType: "application/pdf",
        userId: studentUser.id,
      },
    ],
  });

  // 9. Seed Student Badges
  await prisma.badgeAward.deleteMany({});
  await prisma.badgeAward.createMany({
    data: [
      {
        name: "Pure Mathematics Unit Mastery",
        description: "Achieved 100% completion in P1 & P2 calculus foundations.",
        userId: studentUser.id,
      },
      {
        name: "Experimental Physics Distinction",
        description: "Completed laboratory analysis and uncertainty evaluation.",
        userId: studentUser.id,
      },
    ],
  });

  // 10. Upsert default token bundle packages into the database
  for (const bundle of DEFAULT_BUNDLES) {
    await prisma.tokenBundle.upsert({
      where: { id: bundle.id },
      update: {
        name: bundle.name,
        hours: bundle.hours,
        tokens: bundle.tokens,
        price: bundle.price,
        popular: bundle.popular,
        badge: bundle.badge,
        description: bundle.description,
        roleTarget: bundle.roleTarget,
        ctaText: bundle.ctaText,
        features: bundle.features,
      },
      create: {
        id: bundle.id,
        name: bundle.name,
        hours: bundle.hours,
        tokens: bundle.tokens,
        price: bundle.price,
        popular: bundle.popular,
        badge: bundle.badge,
        description: bundle.description,
        roleTarget: bundle.roleTarget,
        ctaText: bundle.ctaText,
        features: bundle.features,
      },
    });
  }
  console.log(`💰 Token bundle packages upserted into DB: ${DEFAULT_BUNDLES.map((b) => b.name).join(", ")}`);

  console.log("🚀 Database successfully seeded with 1 Admin, 1 Instructor, and 1 Student!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
