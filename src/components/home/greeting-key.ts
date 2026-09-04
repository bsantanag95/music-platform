export type GreetingKey = "greetingMorning" | "greetingAfternoon" | "greetingEvening";

export function greetingKey(now: Date): GreetingKey {
  const hour = now.getHours();
  if (hour < 12) return "greetingMorning";
  if (hour < 19) return "greetingAfternoon";
  return "greetingEvening";
}
