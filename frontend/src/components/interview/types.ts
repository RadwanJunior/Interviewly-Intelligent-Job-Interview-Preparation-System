export interface Recording {
  blob: Blob | null;
  url: string | null;
  mimeType: string | null;
}

export interface Question {
  id: string;
  question: string;
  order: number;
}
