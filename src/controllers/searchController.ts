import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/db";

export const search = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { q = "", limit = "20" } = req.query as { q?: string; limit?: string };
    const query = (q || "").toString().trim();
    const limitNum = Math.min(Math.max(parseInt(limit || "20"), 1), 50);
    if (!query) return reply.status(200).send({ results: [] });

    // Search confessions by title/description
    const confessions = await (prisma as any).confession.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        images: true,
        createdAt: true,
        isAdult: true,
        isSensitive: true,
        user: { select: { id: true, nickname: true, avatarUrl: true } },
        _count: { select: { Upvotes: true, Comments: true } },
      },
    });

    // Communities by name/description
    const communities = await (prisma as any).communities.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        createdAt: true,
        _count: { select: { Confessions: true } },
      },
    });

    // Comments and replies by content
    const comments = await (prisma as any).comment.findMany({
      where: {
        comment: { contains: query, mode: "insensitive" },
      },
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        user: { select: { id: true, nickname: true, avatarUrl: true } },
        confession: { select: { id: true, slug: true, title: true } },
        parentId: true,
        _count: { select: { CommentUpvotes: true } },
      },
    });

    const confessionResults = confessions.map((c: any) => ({
        type: "desabafo",
        id: c.id,
        title: c.title,
        description: c.description,
        url: `/confession/${c.slug}`,
        metadata: { upvotes: c._count.Upvotes, comments: c._count.Comments, author: c.user.nickname },
        images: c.images,
      }));

    const communityResults = communities.map((cm: any) => ({
        type: "comunidade",
        id: cm.id,
        title: cm.name,
        description: cm.description,
        url: `/community/${cm.slug}`,
        metadata: { confessions: cm._count.Confessions },
        coverImage: cm.coverImage,
      }));

    const commentResults = await Promise.all(
      comments.map(async (co: any) => {
        const topLevel = await (prisma as any).comment.findMany({
          where: { confessionId: co.confession.id, parentId: null },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        let numberStr = "";
        if (co.parentId) {
          const parentIndex = topLevel.findIndex((c: any) => c.id === co.parentId);
          const replies = await (prisma as any).comment.findMany({
            where: { parentId: co.parentId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          const replyIndex = replies.findIndex((r: any) => r.id === co.id);
          numberStr = `${parentIndex >= 0 ? parentIndex + 1 : 1}.${replyIndex >= 0 ? replyIndex + 1 : 1}`;
        } else {
          const idx = topLevel.findIndex((c: any) => c.id === co.id);
          numberStr = `${idx >= 0 ? idx + 1 : 1}`;
        }

        const hash = `#comment-${numberStr}`;
        return {
          type: co.parentId ? "resposta" : "comentario",
          id: co.id,
          title: co.parentId ? `Resposta de ${co.user.nickname}` : `Comentário de ${co.user.nickname}`,
          description: co.comment,
          url: `/confession/${co.confession.slug}${hash}`,
          metadata: { upvotes: co._count.CommentUpvotes, confessionTitle: co.confession.title, commentNumber: numberStr },
        };
      })
    );

    const results = [
      ...confessionResults,
      ...communityResults,
      ...commentResults,
    ];

    return reply.status(200).send({ results });
  } catch (err) {
    (req as any).log?.error({ err }, "search error");
    return reply.status(500).send({ message: "internal_error" });
  }
};


