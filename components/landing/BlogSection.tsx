"use client";

import React from "react";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollEffects";

export function BlogSection() {
  const posts = [
    {
      id: 1,
      category: "Exam Strategy",
      date: "Oct - 22 - 2026",
      title: "How online 1-on-1 learning is transforming modern exam preparation.",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80",
      desc: "Why individual student pacing and live interactive whiteboards yield better results than mass lecture halls.",
    },
    {
      id: 2,
      category: "Curriculum Insights",
      date: "Oct - 18 - 2026",
      title: "Why syllabus-aligned tutoring is the future of Cambridge & Edexcel education.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80",
      desc: "Deconstructing recent specification changes across London A/L Pure Maths, Physics, and Chemistry mark schemes.",
    },
    {
      id: 3,
      category: "Study Guides",
      date: "Oct - 10 - 2026",
      title: "How to choose the right online tutor & package for your target grades.",
      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80",
      desc: "Key questions to ask during your free 30-minute trial session and how escrow protects your enrollment wallet.",
    },
  ];

  return (
    <section className="py-20 lg:py-24 bg-white relative border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal animation="fade-up" duration={700}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 mb-3">
                <span>Explore Blogs</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-heading text-[#0c2461] tracking-tight leading-tight">
                Explore Latest Blog and Insights.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl">
                Curated articles, study hacks, and examination guidelines from experienced educators.
              </p>
            </div>

            <div>
              <Link
                href="/register"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-105 group"
              >
                <span>See more blogs</span>
                <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* 3 Blog Cards with Staggered Cascading Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, idx) => (
            <ScrollReveal
              key={post.id}
              animation="fade-up"
              delay={idx * 120}
              className="h-full"
            >
              <article className="h-full bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  {/* Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6">
                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>{post.date}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold font-heading text-[#0c2461] group-hover:text-blue-600 transition-colors leading-snug mb-2">
                      {post.title}
                    </h3>

                    {/* Desc */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {post.desc}
                    </p>
                  </div>
                </div>

                {/* Read More */}
                <div className="px-6 pb-6 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c2461] group-hover:text-blue-600 transition-colors">
                    <span>Read more</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </section>
  );
}
