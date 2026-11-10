import { beforeEach, describe, expect, it } from "@jest/globals";
import { BooksService } from "../../src/features/books/books.service.js";

/* ----- fakes ----- */
function makeBook(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Clean Architecture",
    pages: 300,
    thumbnailUrl: null,
    fileId: 9,
    avgRating: 0,
    ratingCount: 0,
    categories: [],
    file: {
      id: 9,
      path: "books/2026/01/abc.pdf",
      status: "CHECKED",
      mimeType: "application/pdf",
      size: 1000,
    },
    ...overrides,
  };
}

const anon = undefined;
const user = { role: "USER", profileId: 2, accountId: 2 } as never;
const admin = { role: "ADMIN", profileId: 1, accountId: 1 } as never;

function buildService(repoOverrides: Record<string, unknown> = {}) {
  const removed: string[] = [];
  const storage = {
    createSignedDownloadUrl: async () => "https://signed/example?token=xyz",
    removeObject: async (p: string) => {
      removed.push(p);
    },
    createSignedUploadUrl: async () => ({
      uploadUrl: "",
      token: null,
      path: "",
    }),
    getObjectInfo: async () => null,
  };
  const repo = {
    findById: async () => makeBook(),
    deleteWithFile: async () => ({
      found: true,
      file: { fileId: 9, path: "books/2026/01/abc.pdf" },
    }),
    findFileById: async () => ({
      id: 9,
      path: "books/2026/01/abc.pdf",
      status: "CHECKED",
      mimeType: "application/pdf",
    }),
    isFileLinked: async () => false,
    create: async () => makeBook(),
    ...repoOverrides,
  };
  const events = { emit: () => undefined };
  // deps are duck-typed; casts keep the test free of the full Prisma types.
  return {
    service: new BooksService(repo as never, storage as never, events as never),
    removed,
  };
}

describe("book file exposure (CRITICAL security)", () => {
  it("hides all file data from anonymous callers", async () => {
    const { service } = buildService();
    const view = await service.getById(anon, 1, {});
    expect(view.hasFile).toBe(true);
    expect("file" in view).toBe(false);
    expect(JSON.stringify(view)).not.toContain("abc.pdf");
    expect(JSON.stringify(view)).not.toContain("signed");
  });

  it("hides all file data from normal USER callers", async () => {
    const { service } = buildService();
    const view = await service.getById(user, 1, {});
    expect("file" in view).toBe(false);
    expect(JSON.stringify(view)).not.toContain("abc.pdf");
  });

  it("exposes a temporary signed URL to ADMIN callers", async () => {
    const { service } = buildService();
    const view = (await service.getById(admin, 1, {})) as {
      file: { signedUrl: string };
    };
    expect(view.file.signedUrl).toBe("https://signed/example?token=xyz");
  });
});

describe("book deletion", () => {
  it("removes the bucket object after deleting the rows", async () => {
    const { service, removed } = buildService();
    await service.delete(admin, 1);
    expect(removed).toEqual(["books/2026/01/abc.pdf"]);
  });

  it("404s when the book does not exist", async () => {
    const { service } = buildService({
      deleteWithFile: async () => ({ found: false }),
    });
    await expect(service.delete(admin, 999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("linking a file to a book", () => {
  it("refuses to link an unverified (PENDING) file", async () => {
    const { service } = buildService({
      findFileById: async () => ({
        id: 9,
        path: "x",
        status: "PENDING",
        mimeType: "application/pdf",
      }),
    });
    await expect(
      service.create(admin, {
        title: "X",
        pages: 1,
        thumbnailUrl: null,
        fileId: 9,
        categoryIds: [],
      } as never),
    ).rejects.toMatchObject({ code: "FILE_NOT_CHECKED" });
  });

  it("refuses to link a non-PDF file", async () => {
    const { service } = buildService({
      findFileById: async () => ({
        id: 9,
        path: "x",
        status: "CHECKED",
        mimeType: "image/png",
      }),
    });
    await expect(
      service.create(admin, {
        title: "X",
        pages: 1,
        thumbnailUrl: null,
        fileId: 9,
        categoryIds: [],
      } as never),
    ).rejects.toMatchObject({ code: "INVALID_FILE_TYPE" });
  });

  it("refuses a file already linked to another book", async () => {
    const { service } = buildService({ isFileLinked: async () => true });
    await expect(
      service.create(admin, {
        title: "X",
        pages: 1,
        thumbnailUrl: null,
        fileId: 9,
        categoryIds: [],
      } as never),
    ).rejects.toMatchObject({ code: "FILE_ALREADY_LINKED" });
  });
});
