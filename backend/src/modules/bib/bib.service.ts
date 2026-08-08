import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import { canAccessEventManagement } from '@/modules/auth/auth.policy';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import {
  activateBibTemplateVersion,
  archiveBibTemplateVersion,
  clearActiveBibTemplateVersion,
  createBibDocument,
  createBibTemplateVersion,
  getBibTemplateVersionById,
  getBibTemplateAssignmentProgressForAdmin,
  getBibTemplateDetailForAdmin,
  getBibTemplateStatsForAdmin,
  getBibGenerationData,
  getOrCreateBibSettings,
  listBibTemplateFilterEventsForAdmin,
  listBibTemplatesForAdmin,
  listEventsWithoutActiveBibTemplateForAdmin,
  listBibTemplateVersions,
  listRecentBibTemplateActivitiesForAdmin,
  updateBibSettings,
  updateBibTemplateMetadata,
} from '@/modules/bib/bib.repository';
import {
  bibSettingsSchema,
  bibTemplateListFilterSchema,
  bibTemplateMetadataSchema,
  type BibSettingsInput,
  type BibTemplateListFilterInput,
  type BibTemplateMetadataInput,
} from '@/modules/bib/bib.schema';
import type {
  BibGenerationData,
  BibSettings,
  BibTemplateDashboardData,
  BibTemplateDetailData,
  BibTemplateStatus,
  BibTemplateVersion,
} from '@/modules/bib/bib.types';
import { getManageableEvent } from '@/modules/events/event.service';
import { enqueueBackgroundJob } from '@/modules/jobs/job.repository';
import {
  getRegistrationSummary,
  updateRegistrationBibStatus,
} from '@/modules/registrations/registration.repository';
import {
  putPrivateObject,
  getPrivateObject,
} from '@/modules/storage/storage.service';
import { env } from '@/shared/config/env';
import { ApplicationError } from '@/shared/errors/application-error';

function assertCanManageBib(admin: AuthenticatedAdmin): void {
  if (!canAccessEventManagement(admin)) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin cannot manage BIB',
      safeMessage: 'Role Anda tidak dapat mengelola BIB.',
      statusCode: 403,
    });
  }
}

function assertTemplateImage(format: string | undefined): void {
  if (format !== 'png' && format !== 'jpeg') {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'BIB template is not PNG or JPEG',
      safeMessage: 'Template BIB harus berupa PNG atau JPG yang valid.',
      statusCode: 400,
    });
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgText(input: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  alignment: 'LEFT' | 'CENTER' | 'RIGHT';
}) {
  const anchor =
    input.alignment === 'LEFT'
      ? 'start'
      : input.alignment === 'RIGHT'
        ? 'end'
        : 'middle';
  const x =
    input.alignment === 'LEFT'
      ? input.x
      : input.alignment === 'RIGHT'
        ? input.x + input.width
        : input.x + input.width / 2;
  const y = input.y + input.height / 2 + input.fontSize * 0.36;

  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${xmlEscape(input.fontFamily)}" font-size="${input.fontSize}" font-weight="${input.fontWeight}" fill="${input.color}">${xmlEscape(input.text)}</text>`;
}

function buildBibOverlay(data: BibGenerationData): Buffer {
  const settings = data.settings;
  const textElements = [
    svgText({
      text: data.bibNumber,
      x: settings.numberAreaX,
      y: settings.numberAreaY,
      width: settings.numberAreaWidth,
      height: settings.numberAreaHeight,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      fontWeight: settings.fontWeight,
      color: settings.textColor,
      alignment: settings.textAlignment,
    }),
  ];

  if (settings.showParticipantName) {
    textElements.push(
      svgText({
        text: data.participantName,
        x: settings.participantNameX,
        y: settings.participantNameY,
        width: settings.participantNameWidth,
        height: settings.participantNameHeight,
        fontSize: settings.participantNameFontSize,
        fontFamily: settings.fontFamily,
        fontWeight: 600,
        color: settings.textColor,
        alignment: settings.textAlignment,
      }),
    );
  }

  if (settings.showCategoryLabel) {
    textElements.push(
      svgText({
        text: data.categoryLabel,
        x: settings.categoryLabelX,
        y: settings.categoryLabelY,
        width: settings.categoryLabelWidth,
        height: settings.categoryLabelHeight,
        fontSize: settings.categoryLabelFontSize,
        fontFamily: settings.fontFamily,
        fontWeight: 500,
        color: settings.textColor,
        alignment: settings.textAlignment,
      }),
    );
  }

  return Buffer.from(
    `<svg width="${settings.templateCanvasWidth}" height="${settings.templateCanvasHeight}" viewBox="0 0 ${settings.templateCanvasWidth} ${settings.templateCanvasHeight}" xmlns="http://www.w3.org/2000/svg">${textElements.join('')}</svg>`,
    'utf8',
  );
}

export function formatBibNumber(input: {
  sequence: number;
  prefix: string;
  suffix: string | null;
  padding: number;
}): string {
  return `${input.prefix}${String(input.sequence).padStart(input.padding, '0')}${input.suffix ?? ''}`;
}

export async function getBibAdminPageData(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<{ settings: BibSettings; templates: BibTemplateVersion[] }> {
  assertCanManageBib(admin);
  await getManageableEvent(eventId, admin);

  return {
    settings: await getOrCreateBibSettings(eventId),
    templates: await listBibTemplateVersions(eventId),
  };
}

export async function getBibTemplateDashboardData(input: {
  admin: AuthenticatedAdmin;
  filters: BibTemplateListFilterInput;
}): Promise<BibTemplateDashboardData> {
  assertCanManageBib(input.admin);
  const filters = bibTemplateListFilterSchema.parse(input.filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
  const listFilters = { ...filters, page, pageSize };
  const [
    listResult,
    stats,
    events,
    eventsWithoutTemplate,
    latestTemplates,
    topUsedTemplates,
    recentActivities,
    assignmentProgress,
  ] = await Promise.all([
    listBibTemplatesForAdmin(input.admin, listFilters),
    getBibTemplateStatsForAdmin(input.admin),
    listBibTemplateFilterEventsForAdmin(input.admin),
    listEventsWithoutActiveBibTemplateForAdmin(input.admin, 5),
    listBibTemplatesForAdmin(input.admin, { page: 1, pageSize: 100 }),
    listBibTemplatesForAdmin(input.admin, { page: 1, pageSize: 5 }),
    listRecentBibTemplateActivitiesForAdmin(input.admin, 6),
    getBibTemplateAssignmentProgressForAdmin(input.admin),
  ]);
  const totalPages = Math.max(1, Math.ceil(listResult.totalItems / pageSize));

  return {
    stats,
    items: listResult.items,
    pagination: {
      page: Math.min(page, totalPages),
      pageSize,
      totalItems: listResult.totalItems,
      totalPages,
    },
    filterOptions: { events },
    eventsWithoutTemplate,
    latestTemplates: latestTemplates.items,
    topUsedTemplates: [...topUsedTemplates.items]
      .sort((left, right) => right.usageCount - left.usageCount)
      .slice(0, 5),
    recentActivities,
    assignmentProgress,
  };
}

export async function getBibTemplateDetailData(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
}): Promise<BibTemplateDetailData> {
  assertCanManageBib(input.admin);
  const detail = await getBibTemplateDetailForAdmin(
    input.templateVersionId,
    input.admin,
  );

  if (!detail) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  return {
    ...detail,
    manageableEvents: await listBibTemplateFilterEventsForAdmin(input.admin),
  };
}

export async function getBibTemplatePreviewForAdmin(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
}): Promise<{ buffer: Buffer; template: BibTemplateVersion }> {
  assertCanManageBib(input.admin);
  const template = await getBibTemplateVersionById(input.templateVersionId);

  if (!template) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template version not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(template.eventId, input.admin);

  return {
    buffer: await getPrivateObject(template.objectKey),
    template,
  };
}

export async function updateManagedBibSettings(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  settings: BibSettingsInput;
  correlationId: string | null;
}): Promise<BibSettings> {
  assertCanManageBib(input.admin);
  await getManageableEvent(input.eventId, input.admin);
  const parsed = bibSettingsSchema.parse(input.settings);

  return withTransaction(async (client) => {
    await getOrCreateBibSettings(input.eventId, client);
    const settings = await updateBibSettings(input.eventId, parsed, client);
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_SETTINGS_UPDATED',
        entityType: 'EVENT_BIB_SETTINGS',
        entityId: input.eventId,
        eventId: input.eventId,
        newValues: {
          prefix: settings.bibPrefix,
          padding: settings.numericPadding,
          nextSequence: settings.nextSequence,
          activeTemplateVersionId: settings.activeTemplateVersionId,
        },
        correlationId: input.correlationId,
      },
      client,
    );
    return settings;
  });
}

export async function uploadManagedBibTemplate(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  file: File;
  name?: string | null;
  description?: string | null;
  status?: BibTemplateStatus;
  correlationId: string | null;
}): Promise<BibTemplateVersion> {
  assertCanManageBib(input.admin);
  await getManageableEvent(input.eventId, input.admin);

  if (input.file.size <= 0 || input.file.size > env.BIB_TEMPLATE_MAX_BYTES) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'BIB template size is invalid',
      safeMessage: 'Ukuran template BIB tidak sesuai batas konfigurasi.',
      statusCode: 400,
    });
  }

  const uploadedBuffer = Buffer.from(await input.file.arrayBuffer());
  const metadata = await sharp(uploadedBuffer).metadata();
  assertTemplateImage(metadata.format);

  if (!metadata.width || !metadata.height) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'BIB template metadata is invalid',
      safeMessage: 'Template BIB harus berupa PNG atau JPG yang valid.',
      statusCode: 400,
    });
  }

  const buffer =
    metadata.format === 'png'
      ? uploadedBuffer
      : await sharp(uploadedBuffer).png().toBuffer();
  const templateVersionId = randomUUID();
  const objectKey = `events/${input.eventId}/templates/bib/${templateVersionId}.png`;
  const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

  await putPrivateObject({ objectKey, body: buffer, contentType: 'image/png' });

  return withTransaction(async (client) => {
    await getOrCreateBibSettings(input.eventId, client);
    const template = await createBibTemplateVersion(
      {
        id: templateVersionId,
        eventId: input.eventId,
        name:
          input.name?.trim() ||
          `Template BIB ${metadata.width}x${metadata.height}`,
        description: input.description?.trim() || null,
        status: input.status ?? 'ACTIVE',
        objectKey,
        canvasWidth: metadata.width,
        canvasHeight: metadata.height,
        fileSizeBytes: buffer.length,
        checksumSha256,
        uploadedByAdminUserId: input.admin.id,
      },
      client,
    );
    if ((input.status ?? 'ACTIVE') === 'ACTIVE') {
      await activateBibTemplateVersion(
        input.eventId,
        template.id,
        input.admin.id,
        client,
      );
    }
    await updateBibSettings(
      input.eventId,
      {
        ...(await getOrCreateBibSettings(input.eventId, client)),
        templateCanvasWidth: metadata.width,
        templateCanvasHeight: metadata.height,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_TEMPLATE_UPLOADED',
        entityType: 'BIB_TEMPLATE_VERSION',
        entityId: template.id,
        eventId: input.eventId,
        newValues: {
          name: template.name,
          status: input.status ?? 'ACTIVE',
          version: template.versionNumber,
          width: template.canvasWidth,
          height: template.canvasHeight,
        },
        correlationId: input.correlationId,
      },
      client,
    );
    return template;
  });
}

export async function updateManagedBibTemplateMetadata(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
  metadata: BibTemplateMetadataInput;
  correlationId: string | null;
}): Promise<BibTemplateVersion> {
  assertCanManageBib(input.admin);
  const parsed = bibTemplateMetadataSchema.parse(input.metadata);
  const current = await getBibTemplateVersionById(input.templateVersionId);

  if (!current) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(current.eventId, input.admin);

  return withTransaction(async (client) => {
    const updated = await updateBibTemplateMetadata(
      {
        templateVersionId: input.templateVersionId,
        name: parsed.name,
        description: parsed.description,
        updatedByAdminUserId: input.admin.id,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_TEMPLATE_METADATA_UPDATED',
        entityType: 'BIB_TEMPLATE_VERSION',
        entityId: updated.id,
        eventId: updated.eventId,
        previousValues: {
          name: current.name,
          description: current.description,
        },
        newValues: {
          name: updated.name,
          description: updated.description,
        },
        correlationId: input.correlationId,
      },
      client,
    );
    return updated;
  });
}

export async function publishManagedBibTemplate(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<BibTemplateVersion> {
  assertCanManageBib(input.admin);
  const current = await getBibTemplateVersionById(input.templateVersionId);

  if (!current) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(current.eventId, input.admin);

  return withTransaction(async (client) => {
    await activateBibTemplateVersion(
      current.eventId,
      current.id,
      input.admin.id,
      client,
    );
    const updated = await getBibTemplateVersionById(current.id, client);

    if (!updated) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'BIB template not found after publish',
        safeMessage: 'Template BIB tidak ditemukan.',
        statusCode: 404,
      });
    }

    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_TEMPLATE_PUBLISHED',
        entityType: 'BIB_TEMPLATE_VERSION',
        entityId: current.id,
        eventId: current.eventId,
        previousValues: { status: current.status, isActive: current.isActive },
        newValues: { status: updated.status, isActive: updated.isActive },
        correlationId: input.correlationId,
      },
      client,
    );
    return updated;
  });
}

export async function archiveManagedBibTemplate(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<BibTemplateVersion> {
  assertCanManageBib(input.admin);
  const current = await getBibTemplateVersionById(input.templateVersionId);

  if (!current) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(current.eventId, input.admin);

  return withTransaction(async (client) => {
    const updated = await archiveBibTemplateVersion(
      { templateVersionId: current.id, updatedByAdminUserId: input.admin.id },
      client,
    );
    await clearActiveBibTemplateVersion(current.eventId, current.id, client);
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_TEMPLATE_ARCHIVED',
        entityType: 'BIB_TEMPLATE_VERSION',
        entityId: current.id,
        eventId: current.eventId,
        previousValues: { status: current.status, isActive: current.isActive },
        newValues: { status: updated.status, isActive: updated.isActive },
        correlationId: input.correlationId,
      },
      client,
    );
    return updated;
  });
}

export async function duplicateManagedBibTemplate(input: {
  templateVersionId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<BibTemplateVersion> {
  assertCanManageBib(input.admin);
  const current = await getBibTemplateVersionById(input.templateVersionId);

  if (!current) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'BIB template not found',
      safeMessage: 'Template BIB tidak ditemukan.',
      statusCode: 404,
    });
  }

  await getManageableEvent(current.eventId, input.admin);
  const buffer = await getPrivateObject(current.objectKey);
  const templateVersionId = randomUUID();
  const objectKey = `events/${current.eventId}/templates/bib/${templateVersionId}.png`;

  await putPrivateObject({ objectKey, body: buffer, contentType: 'image/png' });

  return withTransaction(async (client) => {
    const duplicate = await createBibTemplateVersion(
      {
        id: templateVersionId,
        eventId: current.eventId,
        name: `${current.name} - Duplikat`.slice(0, 120),
        description: current.description,
        status: 'DRAFT',
        objectKey,
        canvasWidth: current.canvasWidth,
        canvasHeight: current.canvasHeight,
        fileSizeBytes: current.fileSizeBytes,
        checksumSha256: createHash('sha256').update(buffer).digest('hex'),
        uploadedByAdminUserId: input.admin.id,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_TEMPLATE_DUPLICATED',
        entityType: 'BIB_TEMPLATE_VERSION',
        entityId: duplicate.id,
        eventId: duplicate.eventId,
        previousValues: { sourceTemplateVersionId: current.id },
        newValues: { name: duplicate.name, status: duplicate.status },
        correlationId: input.correlationId,
      },
      client,
    );
    return duplicate;
  });
}

export async function renderBibForRegistration(
  registrationId: string,
  options: { force?: boolean } = {},
): Promise<string | null> {
  const data = await getBibGenerationData(registrationId);

  if (!data) {
    throw new ApplicationError({
      code: 'CONFIGURATION_MISSING',
      message: 'Active BIB template is missing',
      safeMessage: 'Template BIB aktif belum tersedia untuk event ini.',
      statusCode: 500,
    });
  }

  if (!options.force && data.currentTemplateVersionId === data.template.id) {
    return null;
  }

  await updateRegistrationBibStatus({
    registrationId,
    bibStatus: 'PROCESSING',
  });
  const templateBuffer = await getPrivateObject(data.template.objectKey);
  const output = await sharp(templateBuffer)
    .resize(
      data.settings.templateCanvasWidth,
      data.settings.templateCanvasHeight,
      { fit: 'fill' },
    )
    .composite([{ input: buildBibOverlay(data), top: 0, left: 0 }])
    .png()
    .toBuffer();
  const documentId = randomUUID();
  const objectKey = `events/${data.eventId}/participants/${data.participantId}/bib/${documentId}.png`;
  await putPrivateObject({ objectKey, body: output, contentType: 'image/png' });

  await withTransaction(async (client) => {
    const bibDocumentId = await createBibDocument(
      {
        registrationId,
        eventId: data.eventId,
        participantId: data.participantId,
        templateVersionId: data.template.id,
        objectKey,
      },
      client,
    );
    await updateRegistrationBibStatus(
      {
        registrationId,
        bibStatus: 'READY',
        bibDocumentId,
        bibError: null,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'WORKER',
        actorId: null,
        action: 'BIB_GENERATED',
        entityType: 'EVENT_REGISTRATION',
        entityId: registrationId,
        eventId: data.eventId,
        newValues: {
          templateVersionId: data.template.id,
          objectKey,
        },
      },
      client,
    );
  });

  return objectKey;
}

export async function requestBibRegenerationForAdmin(input: {
  registrationId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<void> {
  assertCanManageBib(input.admin);

  await withTransaction(async (client) => {
    const summary = await getRegistrationSummary(input.registrationId, client);

    if (!summary) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Registration not found',
        safeMessage: 'Pendaftaran tidak ditemukan.',
        statusCode: 404,
      });
    }

    await getManageableEvent(summary.event.id, input.admin);
    await updateRegistrationBibStatus(
      {
        registrationId: input.registrationId,
        bibStatus: 'PENDING',
        bibError: null,
      },
      client,
    );
    await enqueueBackgroundJob(
      {
        jobType: 'GENERATE_BIB',
        payload: {
          registrationId: input.registrationId,
          force: true,
          emailAfterGenerate: true,
        },
      },
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'BIB_REGENERATION_REQUESTED',
        entityType: 'EVENT_REGISTRATION',
        entityId: input.registrationId,
        eventId: summary.event.id,
        correlationId: input.correlationId,
      },
      client,
    );
  });
}
