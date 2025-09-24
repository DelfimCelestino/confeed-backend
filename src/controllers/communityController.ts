import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/db";
import { generateUniqueCommunitySlug } from "../utils/functions";

type CreateCommunityBody = {
  name: string;
  description: string;
  coverImage?: string | null;
  isAdult?: boolean;
  isSensitive?: boolean;
};

export const createCommunity = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return reply.status(401).send({ message: "unauthorized" });

    const body = req.body as CreateCommunityBody;
    if (!body.name || !body.description) {
      return reply.status(400).send({ message: "name and description are required" });
    }

    const slug = await generateUniqueCommunitySlug(body.name);

    const community = await (prisma as any).communities.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        coverImage: body.coverImage || null,
        isAdult: !!body.isAdult,
        isSensitive: !!body.isSensitive,
        userId,
      },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } }
      }
    });

    return reply.status(201).send({ community });
  } catch (err) {
    (req as any).log?.error({ err }, "create community error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const getCommunities = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { page = "1", limit = "10", q = "" } = req.query as { page?: string; limit?: string; q?: string };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [list, total] = await Promise.all([
      (prisma as any).communities.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          coverImage: true,
          isAdult: true,
          isSensitive: true,
          createdAt: true,
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          _count: { select: { Confessions: true } },
        },
      }),
      (prisma as any).communities.count({ where }),
    ]);

    // compute total upvotes per community (sum of upvotes across confessions in that community)
    const communitiesWithTotals = await Promise.all(
      list.map(async (c: any) => {
        const totalUpvotes = await (prisma as any).upvote.count({
          where: { confession: { communityId: c.id } },
        });
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          coverImage: c.coverImage,
          isAdult: c.isAdult,
          isSensitive: c.isSensitive,
          createdAt: c.createdAt,
          user: c.user,
          confessionsCount: c._count?.Confessions || 0,
          totalUpvotes,
        };
      })
    );

    return reply.status(200).send({
      communities: communitiesWithTotals,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    (req as any).log?.error({ err }, "get communities error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const getCommunityBySlug = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { slug } = req.params as { slug: string };
  const c = await (prisma as any).communities.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        isAdult: true,
        isSensitive: true,
        createdAt: true,
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      _count: { select: { Confessions: true } },
      },
    });
    if (!c) return reply.status(404).send({ message: "community_not_found" });
  const totalUpvotes = await (prisma as any).upvote.count({ where: { confession: { communityId: c.id } } });
  return reply.status(200).send({ community: { ...c, confessionsCount: c._count?.Confessions || 0, totalUpvotes } });
  } catch (err) {
    (req as any).log?.error({ err }, "get community by slug error");
    return reply.status(500).send({ message: "internal_error" });
  }
};


