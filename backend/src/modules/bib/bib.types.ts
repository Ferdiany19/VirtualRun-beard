export type BibTextAlignment = 'LEFT' | 'CENTER' | 'RIGHT';
export type BibFontFamily =
  'Montserrat' | 'Arial' | 'Helvetica' | 'Georgia' | 'Times New Roman';
export type BibTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

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
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  objectKey: string;
  canvasWidth: number;
  canvasHeight: number;
  fileSizeBytes: number;
  checksumSha256: string;
  versionNumber: number;
  isActive: boolean;
  uploadedByAdminUserId: string | null;
  uploadedByAdminName: string | null;
  updatedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BibTemplateListFilters = {
  search?: string | null;
  eventId?: string | null;
  status?: BibTemplateStatus | null;
  orientation?: 'LANDSCAPE' | 'PORTRAIT' | null;
  page?: number;
  pageSize?: number;
};

export type BibTemplateListItem = {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  canvasWidth: number;
  canvasHeight: number;
  versionNumber: number;
  isActive: boolean;
  updatedAt: Date;
  updatedByName: string | null;
  usageCount: number;
};

export type BibTemplateStats = {
  totalTemplates: number;
  activeTemplates: number;
  eventsWithTemplate: number;
  draftOrArchivedTemplates: number;
};

export type BibTemplateFilterOptions = {
  events: Array<{ id: string; name: string }>;
};

export type BibTemplateDashboardData = {
  stats: BibTemplateStats;
  items: BibTemplateListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filterOptions: BibTemplateFilterOptions;
  eventsWithoutTemplate: Array<{ id: string; name: string; status: string }>;
  latestTemplates: BibTemplateListItem[];
  topUsedTemplates: BibTemplateListItem[];
  recentActivities: Array<{
    id: string;
    action: string;
    eventId: string | null;
    eventName: string | null;
    actorName: string | null;
    createdAt: Date;
  }>;
  assignmentProgress: {
    totalEvents: number;
    eventsWithTemplate: number;
    eventsWithoutTemplate: number;
  };
};

export type BibTemplateSampleParticipant = {
  registrationId: string;
  participantName: string;
  bibNumber: string;
  categories: Array<{ id: string; name: string }>;
};

export type BibTemplateDetailData = {
  template: BibTemplateVersion;
  settings: BibSettings;
  templates: BibTemplateVersion[];
  event: {
    id: string;
    name: string;
    slug: string;
  };
  manageableEvents: Array<{ id: string; name: string }>;
  sampleParticipants: BibTemplateSampleParticipant[];
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
