export const interviewTypes = ["Mariée", "Marié", "Couple", "Parents", "Témoins", "Frères / sœurs", "Demoiselles d’honneur", "Garçons d’honneur", "Famille", "Amis", "Invités", "Wedding planner", "Prestataire", "Vœux / déclaration"] as const;
export type InterviewType = (typeof interviewTypes)[number];
export const interviewQuestions: Record<InterviewType, string[]> = {
  Mariée: ["Comment vous êtes-vous rencontrés ?", "Qu’est-ce qui vous a marqué chez l’autre ?", "Qu’attendez-vous le plus de cette journée ?", "Quel souvenir voulez-vous garder ?"],
  Marié: ["Comment vous êtes-vous rencontrés ?", "Qu’est-ce qui vous a marqué chez l’autre ?", "Qu’attendez-vous le plus de cette journée ?", "Quel souvenir voulez-vous garder ?"],
  Couple: ["Comment vous êtes-vous rencontrés ?", "Qu’est-ce qui vous a marqué chez l’autre ?", "Qu’attendez-vous le plus de cette journée ?", "Quel souvenir voulez-vous garder ?"],
  Parents: ["Comment décririez-vous cette personne enfant ?", "Quel souvenir vous revient aujourd’hui ?", "Qu’est-ce qui vous touche dans leur couple ?", "Quel conseil souhaitez-vous leur transmettre ?"],
  Témoins: ["Quel est votre souvenir préféré avec eux ?", "Quand avez-vous compris que leur histoire était importante ?", "Que leur souhaitez-vous pour la suite ?"],
  "Frères / sœurs": ["Quelle anecdote d’enfance vous revient ?", "Qu’est-ce qui vous rend fier ou fière aujourd’hui ?", "Quel conseil ou souhait voulez-vous partager ?"],
  "Demoiselles d’honneur": ["Quel moment de préparation vous a le plus marquée ?", "Comment décririez-vous la mariée aujourd’hui ?", "Quel souvenir voulez-vous lui laisser ?"],
  "Garçons d’honneur": ["Quel souvenir vous revient avec le marié ?", "Quelle qualité le caractérise le mieux ?", "Quel message voulez-vous lui transmettre ?"],
  Famille: ["Quel souvenir de famille vous revient aujourd’hui ?", "Qu’est-ce qui vous rend heureux pour eux ?", "Quel message souhaitez-vous leur transmettre ?"],
  Amis: ["Quelle anecdote les décrit le mieux ?", "Qu’admirez-vous dans leur relation ?", "Quel vœu leur adressez-vous ?"],
  Invités: ["Comment connaissez-vous le couple ?", "Quel moment de la journée vous a touché ?", "Quel message voulez-vous leur laisser ?"],
  "Wedding planner": ["Quel détail de leur journée raconte le mieux leur histoire ?", "Quel moment attendez-vous le plus ?"],
  Prestataire: ["Quel est votre rôle aujourd’hui ?", "Quel conseil pratique aidera l’équipe vidéo/photo ?"],
  "Vœux / déclaration": ["Que voulez-vous lui dire aujourd’hui ?", "Quel souvenir résume votre histoire ?", "Que souhaitez-vous construire ensemble ?"],
};
export function appendInterviewQuestions(current: string, type: InterviewType) {
  const existing = new Set(current.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const additions = interviewQuestions[type].filter((question) => !existing.has(question));
  return [current.trimEnd(), ...additions].filter(Boolean).join("\n");
}
