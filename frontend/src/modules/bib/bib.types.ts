export type BibTextAlignment = "LEFT" | "CENTER" | "RIGHT";
export type BibFontFamily = "Montserrat" | "Arial" | "Helvetica" | "Georgia" | "Times New Roman";

export type BibSettings = {
  eventId: string;
  bibPrefix: string;
  bibSuffix: string | null;
  sequenceStart: number;
  numericPadding: number;
  nextSequence: number;
  textColor: string;
  fontFamily: BibFontFamily;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  textAlignment: BibTextAlignment;
  numberAreaX: number;
  numberAreaY: number;
  numberAreaWidth: number;
  numberAreaHeight: number;
  showParticipantName: boolean;
  participantNameX: number;
  participantNameY: number;
  participantNameWidth: number;
  participantNameHeight: number;
  participantNameFontSize: number;
  showCategoryLabel: boolean;
  categoryLabelX: number;
  categoryLabelY: number;
  categoryLabelWidth: number;
  categoryLabelHeight: number;
  categoryLabelFontSize: number;
  templateCanvasWidth: number;
  templateCanvasHeight: number;
  activeTemplateVersionId: string | null;
  updatedAt: Date;
};

export type BibTemplateVersion = {
  id: string;
  eventId: string;
  objectKey: string;
  canvasWidth: number;
  canvasHeight: number;
  fileSizeBytes: number;
  checksumSha256: string;
  versionNumber: number;
  isActive: boolean;
  createdAt: Date;
};

export type BibGenerationData = {
  registrationId: string;
  eventId: string;
  participantId: string;
  participantName: string;
  bibNumber: string;
  categoryLabel: string;
  settings: BibSettings;
  template: BibTemplateVersion;
  currentTemplateVersionId: string | null;
};
