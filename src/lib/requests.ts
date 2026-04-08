import type { Session, User } from '@supabase/supabase-js';

import { getClientMeta } from './clientMeta';
import { appendSignaturePage } from './pdfSigning';
import { generateSignToken, sha256Hex, sha256HexFromBytes } from './security';
import { getSupabaseConfigSummary, supabase } from './supabase';

export const DOCUMENTS_BUCKET = 'clinicalsign-documents';

export type RequestStatus = 'draft' | 'awaiting_patient' | 'opened' | 'completed' | 'cancelled' | 'expired';
export type ActorType = 'professional' | 'patient';
export type EventType =
  | 'request_created'
  | 'professional_signed'
  | 'link_opened'
  | 'access_code_validated'
  | 'consent_accepted'
  | 'patient_signed'
  | 'request_completed';

export type SignRequest = {
  id: string;
  professional_user_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  document_title: string;
  document_snapshot: string;
  status: RequestStatus;
  sign_token: string;
  access_code: string;
  created_at: string;
  updated_at: string;
  professional_signed_at: string | null;
  patient_opened_at: string | null;
  access_code_validated_at: string | null;
  consent_accepted_at: string | null;
  patient_signed_at: string | null;
  completed_at: string | null;
  professional_signature: string | null;
  patient_signature: string | null;
  document_hash: string;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  original_pdf_hash: string | null;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
};

export type SignRequestDocument = {
  id: string;
  request_id: string;
  document_type: string;
  title: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  original_pdf_hash: string;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
  document_hash: string;
  sort_order: number;
  is_required: boolean;
  consent_accepted_at: string | null;
  professional_signed_at: string | null;
  patient_signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestEvent = {
  id: number;
  request_id: string;
  event_type: EventType;
  created_at: string;
  user_agent: string | null;
  timezone: string | null;
  locale: string | null;
  route_or_origin: string | null;
  actor_type: ActorType;
};

export type ProfessionalProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RpcMetaParams = {
  p_user_agent: string | null;
  p_timezone: string | null;
  p_locale: string | null;
  p_route_or_origin: string | null;
};

type PublicOpenRpcRow = {
  id: string;
  document_title: string;
  request_status: RequestStatus;
  professional_signed_at: string | null;
  patient_opened_at: string | null;
  completed_at: string | null;
};

type PublicOpenResult = {
  id: string;
  document_title: string;
  status: RequestStatus;
  professional_signed_at: string | null;
  patient_opened_at: string | null;
  completed_at: string | null;
};

type PublicReviewRpcRow = {
  id: string;
  patient_name: string;
  document_title: string;
  document_snapshot: string;
  document_hash: string;
  professional_signature: string | null;
  request_status: RequestStatus;
  consent_accepted_at: string | null;
  patient_signed_at: string | null;
  completed_at: string | null;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
  file_name: string | null;
  mime_type: string | null;
};

type PublicReviewDocumentRpcRow = {
  id: string;
  request_id: string;
  document_type: string;
  title: string;
  file_name: string;
  sort_order: number;
  is_required: boolean;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
  document_hash: string;
  consent_accepted_at: string | null;
};

export type PublicReviewResult = {
  id: string;
  patient_name: string;
  document_title: string;
  document_snapshot: string;
  document_hash: string;
  professional_signature: string | null;
  status: RequestStatus;
  consent_accepted_at: string | null;
  patient_signed_at: string | null;
  completed_at: string | null;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
  file_name: string | null;
  mime_type: string | null;
};

export type PublicReviewDocument = {
  id: string;
  request_id: string;
  document_type: string;
  title: string;
  file_name: string;
  sort_order: number;
  is_required: boolean;
  signed_professional_pdf_path: string | null;
  signed_final_pdf_path: string | null;
  document_hash: string;
  consent_accepted_at: string | null;
};

export type CreateRequestDocumentInput = {
  documentType: string;
  title: string;
  pdfFile: File;
  isRequired?: boolean;
};

export type CreateRequestInput = {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  documentTitle?: string;
  documentSnapshot: string;
  signToken?: string;
  accessCode: string;
  documents: CreateRequestDocumentInput[];
};

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
}

function toRpcMeta(routeOrOrigin: string): RpcMetaParams {
  const meta = getClientMeta(routeOrOrigin);
  return {
    p_user_agent: meta.userAgent,
    p_timezone: meta.timezone,
    p_locale: meta.locale,
    p_route_or_origin: meta.routeOrOrigin,
  };
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveProfessionalDisplayNameFromSources(
  profileFullName: string | null,
  user: User | null,
): string {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;

  return (
    toNonEmptyString(profileFullName) ??
    toNonEmptyString(metadata?.full_name) ??
    toNonEmptyString(metadata?.name) ??
    toNonEmptyString(metadata?.display_name) ??
    toNonEmptyString(user?.email) ??
    'Profissional'
  );
}

async function requireUser(): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }

  return user;
}

export function buildRequestDocumentPath(
  signToken: string,
  stage: 'original' | 'professional' | 'final',
  fileName: string,
) {
  return `requests/${signToken}/${stage}/${fileName}`;
}

type UploadOptions = {
  upsert?: boolean;
};

export async function uploadPdfBytes(path: string, bytes: Uint8Array, options?: UploadOptions): Promise<void> {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: options?.upsert ?? true });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadPdfFile(path: string, file: File, options?: UploadOptions): Promise<void> {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/pdf', upsert: options?.upsert ?? false });

  if (error) {
    throw new Error(error.message);
  }
}

export async function downloadDocumentBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error) {
    throw new Error(error.message);
  }

  const bytes = await data.arrayBuffer();
  return new Uint8Array(bytes);
}

export async function createSignedDocumentUrl(path: string, expiresInSeconds = 900): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Não foi possível gerar o link temporário do PDF.');
  }
  return data.signedUrl;
}

export async function signInProfessional(email: string, password: string): Promise<void> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido de autenticação.';

    if (/failed to fetch/i.test(message)) {
      const { refFromUrl, refFromKey } = getSupabaseConfigSummary();
      const refHint =
        refFromUrl && refFromKey && refFromUrl !== refFromKey
          ? ` Projeto da URL: ${refFromUrl}. Projeto da chave anônima: ${refFromKey}.`
          : '';
      throw new Error(
        `Falha de rede ao conectar com o Supabase Auth. Verifique VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e reinicie o Vite.${refHint}`,
      );
    }

    throw new Error(message);
  }
}

export async function signOutProfessional(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return session;
}

export async function getCurrentProfessionalProfile(): Promise<ProfessionalProfile | null> {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    return null;
  }

  return (data as ProfessionalProfile | null) ?? null;
}

export async function getCurrentProfessionalDisplayName(): Promise<string> {
  const session = await getCurrentSession();
  const user = session?.user ?? null;

  if (!user) {
    return 'Profissional';
  }

  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  if (error) {
    return resolveProfessionalDisplayNameFromSources(null, user);
  }

  const profileFullName = (data as { full_name?: string } | null)?.full_name ?? null;
  return resolveProfessionalDisplayNameFromSources(profileFullName, user);
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function listProfessionalRequests(): Promise<SignRequest[]> {
  await requireUser();

  const { data, error } = await supabase
    .from('sign_requests')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SignRequest[];
}

export async function deleteProfessionalRequest(requestId: string): Promise<void> {
  await requireUser();

  const existing = await getProfessionalRequest(requestId);
  if (!existing) {
    throw new Error('Solicitação não encontrada.');
  }

  const documents = await listRequestDocuments(requestId);
  const storagePaths = new Set<string>();
  const addPath = (path: string | null) => {
    if (path) {
      storagePaths.add(path);
    }
  };

  addPath(existing.storage_path);
  addPath(existing.signed_professional_pdf_path);
  addPath(existing.signed_final_pdf_path);

  for (const document of documents) {
    addPath(document.storage_path);
    addPath(document.signed_professional_pdf_path);
    addPath(document.signed_final_pdf_path);
  }

  if (storagePaths.size > 0) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(Array.from(storagePaths));
    if (storageError) {
      console.warn('Falha ao remover todos os arquivos da solicitação no Storage.', storageError);
    }
  }

  const { error } = await supabase.from('sign_requests').delete().eq('id', requestId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getProfessionalRequest(id: string): Promise<SignRequest | null> {
  await requireUser();

  const { data, error } = await supabase.from('sign_requests').select('*').eq('id', id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as SignRequest | null) ?? null;
}

export async function listRequestDocuments(requestId: string): Promise<SignRequestDocument[]> {
  await requireUser();

  const { data, error } = await supabase
    .from('sign_request_documents')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SignRequestDocument[];
}

export async function listRequestEvents(requestId: string): Promise<RequestEvent[]> {
  await requireUser();

  const { data, error } = await supabase
    .from('request_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RequestEvent[];
}

export async function insertProfessionalEvent(
  requestId: string,
  eventType: EventType,
  routeOrOrigin: string,
): Promise<void> {
  await requireUser();
  const meta = getClientMeta(routeOrOrigin);
  const { error } = await supabase.from('request_events').insert({
    request_id: requestId,
    event_type: eventType,
    actor_type: 'professional',
    user_agent: meta.userAgent,
    timezone: meta.timezone,
    locale: meta.locale,
    route_or_origin: meta.routeOrOrigin,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createProfessionalRequest(input: CreateRequestInput): Promise<SignRequest> {
  const user = await requireUser();
  const requestId = crypto.randomUUID();
  const token = input.signToken ?? generateSignToken();
  const preparedDocuments = input.documents.map((document, index) => ({
    sortOrder: index + 1,
    documentType: document.documentType,
    title: document.title,
    isRequired: document.isRequired ?? true,
    pdfFile: document.pdfFile,
  }));

  if (preparedDocuments.length === 0) {
    throw new Error('Adicione pelo menos um documento PDF.');
  }

  const uploadedDocuments: Array<{
    request_id: string;
    document_type: string;
    title: string;
    storage_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    original_pdf_hash: string;
    document_hash: string;
    sort_order: number;
    is_required: boolean;
  }> = [];

  for (const document of preparedDocuments) {
    const documentId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(document.pdfFile.name || `${requestId}-${document.sortOrder}.pdf`);
    const originalPath = buildRequestDocumentPath(token, 'original', `${requestId}-${documentId}-${safeFileName}`);
    const originalBytes = new Uint8Array(await document.pdfFile.arrayBuffer());
    const originalPdfHash = await sha256HexFromBytes(originalBytes);

    try {
      await uploadPdfFile(originalPath, document.pdfFile, { upsert: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido no upload.';
      throw new Error(`Falha ao salvar PDF no armazenamento (clinicalsign-documents): ${message}`);
    }

    uploadedDocuments.push({
      request_id: requestId,
      document_type: document.documentType,
      title: document.title,
      storage_path: originalPath,
      file_name: document.pdfFile.name,
      file_size: document.pdfFile.size,
      mime_type: document.pdfFile.type || 'application/pdf',
      original_pdf_hash: originalPdfHash,
      document_hash: originalPdfHash,
      sort_order: document.sortOrder,
      is_required: document.isRequired,
    });
  }

  const firstDocument = uploadedDocuments[0];
  const requestDocumentTitle = input.documentTitle?.trim() || firstDocument.title;

  const { data, error } = await supabase
    .from('sign_requests')
    .insert({
      id: requestId,
      professional_user_id: user.id,
      patient_name: input.patientName,
      patient_phone: input.patientPhone,
      patient_email: input.patientEmail || null,
      document_title: requestDocumentTitle,
      document_snapshot: input.documentSnapshot,
      status: 'draft',
      sign_token: token,
      access_code: input.accessCode,
      storage_path: firstDocument.storage_path,
      file_name: firstDocument.file_name,
      file_size: firstDocument.file_size,
      mime_type: firstDocument.mime_type,
      original_pdf_hash: firstDocument.original_pdf_hash,
      document_hash: firstDocument.original_pdf_hash,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(uploadedDocuments.map((document) => document.storage_path));
    throw new Error(`Falha ao criar a solicitação no banco de dados: ${error.message}`);
  }

  const { error: documentsError } = await supabase.from('sign_request_documents').insert(uploadedDocuments);
  if (documentsError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(uploadedDocuments.map((document) => document.storage_path));
    await supabase.from('sign_requests').delete().eq('id', requestId);
    throw new Error(`Falha ao salvar os documentos da solicitação: ${documentsError.message}`);
  }

  const created = data as SignRequest;
  try {
    await insertProfessionalEvent(created.id, 'request_created', '/requests/new');
  } catch (error) {
    console.error('Falha ao registrar evento request_created', error);
  }
  return created;
}

export async function signRequestAsProfessional(requestId: string, signature: string): Promise<SignRequest> {
  const existing = await getProfessionalRequest(requestId);
  if (!existing) {
    throw new Error('Solicitação não encontrada.');
  }

  const documents = await listRequestDocuments(requestId);
  const documentsToSign = documents.length > 0 ? documents : [];
  const signedAt = new Date().toISOString();

  if (documentsToSign.length === 0) {
    if (!existing.storage_path) {
      throw new Error('PDF original não encontrado para assinatura profissional.');
    }

    if (existing.professional_signed_at && existing.signed_professional_pdf_path) {
      return existing;
    }

    const sourceBytes = await downloadDocumentBytes(existing.storage_path);
    const signedBytes = await appendSignaturePage(sourceBytes, {
      title: 'Assinatura profissional',
      lines: [
        `Documento: ${existing.document_title}`,
        `Paciente: ${existing.patient_name}`,
        signature,
        `Hash do documento original (SHA-256): ${existing.original_pdf_hash ?? '-'}`,
        `Canal de envio ao paciente: link + código (WhatsApp manual)`,
      ],
    });

    const professionalPath = buildRequestDocumentPath(
      existing.sign_token,
      'professional',
      `${existing.id}-professional-signed.pdf`,
    );

    await uploadPdfBytes(professionalPath, signedBytes);
    const signedHash = await sha256HexFromBytes(signedBytes);

    const { data, error } = await supabase
      .from('sign_requests')
      .update({
        status: 'awaiting_patient',
        professional_signature: signature,
        professional_signed_at: signedAt,
        signed_professional_pdf_path: professionalPath,
        document_hash: signedHash,
        updated_at: signedAt,
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await insertProfessionalEvent(requestId, 'professional_signed', `/requests/${requestId}/sign`);
    return data as SignRequest;
  }

  if (existing.professional_signed_at && documentsToSign.every((document) => Boolean(document.signed_professional_pdf_path))) {
    return existing;
  }

  const signedDocumentMeta: Array<{ id: string; path: string; hash: string }> = [];

  for (const document of documentsToSign) {
    const sourceBytes = await downloadDocumentBytes(document.storage_path);
    const signedBytes = await appendSignaturePage(sourceBytes, {
      title: 'Assinatura profissional',
      lines: [
        `Documento: ${document.title}`,
        `Paciente: ${existing.patient_name}`,
        signature,
        `Hash do documento original (SHA-256): ${document.original_pdf_hash}`,
        `Canal de envio ao paciente: link + código (WhatsApp manual)`,
      ],
    });

    const professionalPath = buildRequestDocumentPath(existing.sign_token, 'professional', `${document.id}-professional-signed.pdf`);
    await uploadPdfBytes(professionalPath, signedBytes);
    const signedHash = await sha256HexFromBytes(signedBytes);

    const { error: documentUpdateError } = await supabase
      .from('sign_request_documents')
      .update({
        signed_professional_pdf_path: professionalPath,
        document_hash: signedHash,
        professional_signed_at: signedAt,
        updated_at: signedAt,
      })
      .eq('id', document.id)
      .eq('request_id', requestId);

    if (documentUpdateError) {
      throw new Error(documentUpdateError.message);
    }

    signedDocumentMeta.push({
      id: document.id,
      path: professionalPath,
      hash: signedHash,
    });
  }

  const aggregateHash = await sha256Hex(signedDocumentMeta.map((document) => `${document.id}:${document.hash}`).join('|'));
  const firstSignedDocument = signedDocumentMeta[0];

  const { data, error } = await supabase
    .from('sign_requests')
    .update({
      status: 'awaiting_patient',
      professional_signature: signature,
      professional_signed_at: signedAt,
      signed_professional_pdf_path: firstSignedDocument.path,
      document_hash: aggregateHash,
      updated_at: signedAt,
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await insertProfessionalEvent(requestId, 'professional_signed', `/requests/${requestId}/sign`);
  return data as SignRequest;
}

export async function openPublicRequest(token: string): Promise<PublicOpenResult | null> {
  const { data, error } = await supabase.rpc('public_open_request', {
    p_token: token,
    ...toRpcMeta(`/sign/${token}`),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as PublicOpenRpcRow;

  return {
    id: row.id,
    document_title: row.document_title,
    status: row.request_status,
    professional_signed_at: row.professional_signed_at,
    patient_opened_at: row.patient_opened_at,
    completed_at: row.completed_at,
  };
}

export async function validatePublicAccessCode(token: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_validate_access_code', {
    p_token: token,
    p_access_code: code,
    ...toRpcMeta(`/sign/${token}/otp`),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getPublicReviewRequest(token: string): Promise<PublicReviewResult | null> {
  const { data, error } = await supabase.rpc('public_get_review_request', {
    p_token: token,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as PublicReviewRpcRow;
  return {
    id: row.id,
    patient_name: row.patient_name,
    document_title: row.document_title,
    document_snapshot: row.document_snapshot,
    document_hash: row.document_hash,
    professional_signature: row.professional_signature,
    status: row.request_status,
    consent_accepted_at: row.consent_accepted_at,
    patient_signed_at: row.patient_signed_at,
    completed_at: row.completed_at,
    signed_professional_pdf_path: row.signed_professional_pdf_path,
    signed_final_pdf_path: row.signed_final_pdf_path,
    file_name: row.file_name,
    mime_type: row.mime_type,
  };
}

export async function listPublicReviewDocuments(token: string): Promise<PublicReviewDocument[]> {
  const { data, error } = await supabase.rpc('public_get_review_documents', {
    p_token: token,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PublicReviewDocumentRpcRow[]).map((row) => ({
    id: row.id,
    request_id: row.request_id,
    document_type: row.document_type,
    title: row.title,
    file_name: row.file_name,
    sort_order: row.sort_order,
    is_required: row.is_required,
    signed_professional_pdf_path: row.signed_professional_pdf_path,
    signed_final_pdf_path: row.signed_final_pdf_path,
    document_hash: row.document_hash,
    consent_accepted_at: row.consent_accepted_at,
  }));
}

export async function acceptPublicConsent(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_accept_consent', {
    p_token: token,
    ...toRpcMeta(`/sign/${token}/review`),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function acceptPublicDocumentConsent(token: string, documentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_accept_document_consent', {
    p_token: token,
    p_document_id: documentId,
    ...toRpcMeta(`/sign/${token}/review`),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function attachPublicFinalDocument(
  token: string,
  documentId: string,
  signedFinalPdfPath: string,
  finalDocumentHash: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_attach_final_document', {
    p_token: token,
    p_document_id: documentId,
    p_signed_final_pdf_path: signedFinalPdfPath,
    p_document_hash: finalDocumentHash,
    ...toRpcMeta(`/sign/${token}/review`),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function signPublicRequest(
  token: string,
  patientSignature: string,
  signedFinalPdfPath: string,
  finalDocumentHash: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_patient_sign_request', {
    p_token: token,
    p_patient_signature: patientSignature,
    p_signed_final_pdf_path: signedFinalPdfPath,
    p_document_hash: finalDocumentHash,
    ...toRpcMeta(`/sign/${token}/review`),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
