import { describe, expect, it } from "vitest";
import { appendInterviewQuestions, interviewTypes } from "../src/interviews";

describe("modèles d’interviews", () => {
  it("ajoute les questions au texte sans effacer ni répéter une question", () => {
    const first = "Note existante\nComment vous êtes-vous rencontrés ?";
    const next = appendInterviewQuestions(first, "Couple");
    expect(next.startsWith("Note existante")).toBe(true);
    expect(next.match(/Comment vous êtes-vous rencontrés \?/g)).toHaveLength(1);
    expect(next).toContain("Quel souvenir voulez-vous garder ?");
  });
  it("propose distinctement les proches et membres du cortège", () => {
    expect(interviewTypes).toContain("Frères / sœurs");
    expect(interviewTypes).toContain("Demoiselles d’honneur");
    expect(interviewTypes).toContain("Garçons d’honneur");
    expect(interviewTypes).toContain("Parents");
  });
});
