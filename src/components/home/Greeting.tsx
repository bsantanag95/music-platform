"use client";

import { useEffect, useState } from "react";
import { greetingKey, type GreetingKey } from "@/components/home/greeting-key";

interface GreetingProps {
  initialKey: GreetingKey;
  morning: string;
  afternoon: string;
  evening: string;
}

// El valor inicial coincide con el SSR; después se corrige con la zona horaria
// local del navegador para no depender de la zona horaria del servidor.
export function Greeting({ initialKey, morning, afternoon, evening }: GreetingProps) {
  const [currentKey, setCurrentKey] = useState(initialKey);

  useEffect(() => {
    setCurrentKey(greetingKey(new Date()));
  }, []);

  const messages: Record<GreetingKey, string> = {
    greetingMorning: morning,
    greetingAfternoon: afternoon,
    greetingEvening: evening,
  };

  return <span>{messages[currentKey]}</span>;
}
