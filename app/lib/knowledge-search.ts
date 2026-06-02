/**
 * Knowledge search and chunking for RAG.
 * Chunks documents, scores relevance, and selects top-K relevant chunks.
 * Designed for future vector embeddings — currently uses keyword matching.
 */

export type ChunkMetadata = {
  sourceFile: string;
  chunkIndex: number;
  totalChunks?: number;
};

export type RelevantChunk = {
  content: string;
  relevanceScore: number;
  metadata: ChunkMetadata;
};

/**
 * Split text into chunks by sentences/paragraphs.
 * Target ~500 tokens per chunk (~2000 chars).
 * Return chunks with metadata.
 */
export function chunkDocument(
  text: string,
  sourceFile: string,
  targetChunkSize: number = 2000,
): { chunks: string[]; metadata: ChunkMetadata[] } {
  const lines = text.split(/\n+/).filter((l) => l.trim());
  const chunks: string[] = [];
  const metadata: ChunkMetadata[] = [];
  let currentChunk = "";

  for (const line of lines) {
    if ((currentChunk + "\n" + line).length > targetChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      metadata.push({
        sourceFile,
        chunkIndex: chunks.length - 1,
      });
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
    metadata.push({ sourceFile, chunkIndex: chunks.length - 1 });
  }

  // Add total chunk count to all
  metadata.forEach((m) => { m.totalChunks = chunks.length; });

  return { chunks, metadata };
}

/**
 * Score relevance of a chunk to a query using keyword matching.
 * Higher score = more relevant.
 * Future: replace with semantic similarity from embeddings.
 */
export function scoreRelevance(chunk: string, query: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  if (queryTerms.length === 0) return 0;

  const chunkLower = chunk.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    const regex = new RegExp(`\\b${term}\\b`, "g");
    const matches = chunkLower.match(regex);
    score += (matches?.length ?? 0) * 10;
  }

  // Bonus: exact phrase match
  const exactPhrase = queryTerms.join("\\s+");
  const phraseRegex = new RegExp(exactPhrase, "g");
  const phraseMatches = chunkLower.match(phraseRegex);
  score += (phraseMatches?.length ?? 0) * 50;

  // Normalize by chunk length to avoid bias toward longer chunks
  return Math.max(0, score / Math.sqrt(chunk.length / 100));
}

/**
 * Find most relevant chunks from a corpus based on query.
 * Returns top-K chunks sorted by relevance (highest first).
 */
export function findRelevantChunks(
  chunks: string[],
  metadata: ChunkMetadata[],
  query: string,
  topK: number = 5,
): RelevantChunk[] {
  const scored = chunks.map((chunk, idx) => ({
    content: chunk,
    relevanceScore: scoreRelevance(chunk, query),
    metadata: metadata[idx] || { sourceFile: "unknown", chunkIndex: idx },
  }));

  // Filter out zero-scored chunks, then sort by relevance
  return scored
    .filter((c) => c.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topK);
}

/**
 * Format relevant chunks for injection into the prompt.
 */
export function formatRelevantChunks(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) return "";
  return [
    "RELEVANT KNOWLEDGE BASE:",
    ...chunks.map(
      (c, i) =>
        `[${c.metadata.sourceFile}:${c.metadata.chunkIndex}]\n${c.content}`,
    ),
  ].join("\n\n");
}
