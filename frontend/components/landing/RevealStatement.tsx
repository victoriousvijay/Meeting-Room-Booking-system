"use client";

// A paragraph whose words light up one after another as it scrolls into view.
import { type MotionValue, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const color = useTransform(progress, range, ["hsl(0 0% 35%)", "hsl(0 0% 100%)"]);
  return (
    <motion.span style={{ opacity, color }} className="mr-[0.3em]">
      {word}
    </motion.span>
  );
}

export default function RevealStatement({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  // 0 when the paragraph's top enters the bottom of the screen, 1 when its end
  // reaches the middle: each word owns an equal slice of that journey.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end center"] });
  const words = text.split(" ");

  if (reduceMotion) {
    return (
      <p ref={ref} className="text-3xl font-medium leading-[1.2] md:text-5xl">
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className="flex flex-wrap text-3xl font-medium leading-[1.2] md:text-5xl">
      {words.map((word, i) => (
        <Word key={i} word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
      ))}
    </p>
  );
}
