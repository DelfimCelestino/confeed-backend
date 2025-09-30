import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/db";
import { generateUniqueSlug } from "../utils/functions";

type CreateConfessionBody = {
  title: string;
  description: string;
  images: string[];
  isAdult: boolean;
  isSensitive: boolean;
  communitySlug?: string;
  videoUrl?: string;
};

export const createConfession = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const body = req.body as CreateConfessionBody;
    
    // Validate required fields
    if (!body.title || !body.description) {
      return reply.status(400).send({ message: "title and description are required" });
    }

    if (body.title.length < 3 || body.title.length > 1000) {
      return reply.status(400).send({ message: "title must be between 3 and 1000 characters" });
    }

    if (body.description.length < 100) {
      return reply.status(400).send({ message: "description must be at least 100 characters" });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(body.title);

    // Resolve optional community
    let communityId: string | null = null;
    if (body.communitySlug) {
      const community = await (prisma as any).communities.findUnique({ where: { slug: body.communitySlug } });
      if (!community) {
        return reply.status(400).send({ message: "community_not_found" });
      }
      communityId = community.id;
    }

    // Create confession
    const confession = await (prisma as any).confession.create({
      data: {
        title: body.title,
        slug: slug,
        description: body.description,
        images: body.images || [],
        videoUrl: body.videoUrl || null,
        isAdult: body.isAdult || false,
        isSensitive: body.isSensitive || false,
        userId: userId,
        communityId: communityId,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        community: {
          select: { id: true, name: true, slug: true, coverImage: true }
        },
      }
    });

          // create notification to community owner if applicable
          if (communityId) {
            try {
              const community = await (prisma as any).communities.findUnique({ where: { id: communityId }, select: { id: true, userId: true, slug: true, name: true } });
              if (community && community.userId !== userId) {
                await (prisma as any).notification.create({
                  data: {
                    type: 'comment',
                    recipientId: community.userId,
                    actorId: userId,
                    title: 'Novo desabafo na sua comunidade',
                    description: body.title,
                    url: `/community/${community.slug}`,
                    communityId: community.id,
                    confessionId: undefined,
                  }
                });
              }
            } catch {}
          }

          return reply.status(201).send({
      confession: {
        id: confession.id,
        title: confession.title,
        slug: confession.slug,
        description: confession.description,
        images: confession.images,
        videoUrl: confession.videoUrl,
        isAdult: confession.isAdult,
        isSensitive: confession.isSensitive,
        createdAt: confession.createdAt,
        user: confession.user,
        community: confession.community || null,
      }
    });
  } catch (err) {
    req.log.error({ err }, "create confession error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const getConfessions = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { page = "1", limit = "100", communitySlug } = req.query as { page?: string; limit?: string; communitySlug?: string };
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const userId = (req as any).user?.id;

    // Total count (respecting optional community filter)
    const total = await (prisma as any).confession.count({
      where: communitySlug ? { community: { is: { slug: communitySlug } } } : {},
    });
    
    // Fetch by newest first with Prisma, then shuffle in-memory
    const baseWhere = communitySlug ? { community: { is: { slug: communitySlug } } } : {};
    const confessions = await (prisma as any).confession.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        community: { select: { id: true, name: true, slug: true, coverImage: true } },
        Upvotes: {
          select: {
            id: true,
            userId: true,
          }
        },
        _count: {
          select: {
            Upvotes: true,
          }
        }
      }
    });

    if (confessions.length === 0) {
      return reply.status(200).send({
        confessions: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        }
      });
    }
    
    // Shuffle in-memory (Fisher–Yates)
    const shuffled = [...confessions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return reply.status(200).send({
      confessions: await Promise.all(shuffled.map(async (confession: any) => {
        const hasUserUpvoted = userId ? confession.Upvotes.some((upvote: any) => upvote.userId === userId) : false;
        const topLevelComments = await (prisma as any).comment.count({ where: { confessionId: confession.id, parentId: null } });
        return {
          id: confession.id,
          title: confession.title,
          slug: confession.slug,
          description: confession.description,
          images: confession.images,
          videoUrl: confession.videoUrl,
          isAdult: confession.isAdult,
          isSensitive: confession.isSensitive,
          createdAt: confession.createdAt,
          user: confession.user,
          community: confession.community ? {
            id: confession.community.id,
            name: confession.community.name,
            slug: confession.community.slug,
            coverImage: confession.community.coverImage,
          } : null,
          upvotes: confession._count.Upvotes,
          comments: topLevelComments,
          isUpvoted: hasUserUpvoted,
        };
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (err) {
    req.log.error({ err }, "get confessions error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const getConfessionBySlug = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { slug } = req.params as { slug: string };
    const userId = (req as any).user?.id;

    const confession = await (prisma as any).confession.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        community: { select: { id: true, name: true, slug: true, coverImage: true } },
        Upvotes: {
          select: {
            id: true,
            userId: true,
          }
        },
        Comments: {
          where: {
            parentId: null, // Only top-level comments
          },
          select: {
            id: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
              }
            },
            CommentUpvotes: {
              select: {
                id: true,
                userId: true,
              }
            },
            replies: {
              select: {
                id: true,
                comment: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    avatarUrl: true,
                  }
                },
                CommentUpvotes: {
                  select: {
                    id: true,
                    userId: true,
                  }
                },
                _count: {
                  select: {
                    CommentUpvotes: true,
                  }
                }
              },
              orderBy: { createdAt: "asc" }
            },
            _count: {
              select: {
                CommentUpvotes: true,
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            Upvotes: true,
          }
        }
      }
    });

    if (!confession) {
      return reply.status(404).send({ message: "confession_not_found" });
    }

    // Check if user has upvoted this confession
    const hasUserUpvoted = userId ? confession.Upvotes.some((upvote: any) => upvote.userId === userId) : false;

    // Determine the first (oldest) top-level comment id
    const oldestTopLevel = await (prisma as any).comment.findFirst({
      where: { confessionId: confession.id, parentId: null },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });
    const firstCommentId = oldestTopLevel?.id || null;

    // Process comments to add upvote info and first comment badge based on oldest
    const processedComments = confession.Comments.map((comment: any) => {
      const hasUserUpvotedComment = userId ? comment.CommentUpvotes.some((upvote: any) => upvote.userId === userId) : false;
      const isFirstComment = firstCommentId ? comment.id === firstCommentId : false;
      
      // Process replies
      const processedReplies = comment.replies.map((reply: any) => {
        const hasUserUpvotedReply = userId ? reply.CommentUpvotes.some((upvote: any) => upvote.userId === userId) : false;
        return {
          ...reply,
          upvotes: reply._count?.CommentUpvotes || 0,
          isUpvoted: hasUserUpvotedReply,
        };
      });

      return {
        ...comment,
        upvotes: comment._count?.CommentUpvotes || 0,
        isUpvoted: hasUserUpvotedComment,
        isFirstComment,
        replies: processedReplies,
      };
    });

    return reply.status(200).send({
      confession: {
        id: confession.id,
        title: confession.title,
        slug: confession.slug,
        description: confession.description,
        images: confession.images,
        videoUrl: (confession as any).videoUrl,
        isAdult: confession.isAdult,
        isSensitive: confession.isSensitive,
        createdAt: confession.createdAt,
        user: confession.user,
        community: confession.community ? {
          id: confession.community.id,
          name: confession.community.name,
          slug: confession.community.slug,
          coverImage: confession.community.coverImage,
        } : null,
        upvotes: confession._count.Upvotes,
        comments: processedComments.length,
        commentsList: processedComments,
        isUpvoted: hasUserUpvoted,
      }
    });
  } catch (err) {
    req.log.error({ err }, "get confession by id error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const upvoteConfession = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const { id } = req.params as { id: string };
    const { isUpvoted } = req.body as { isUpvoted: boolean };

    // Check if upvote already exists
    const existingUpvote = await (prisma as any).upvote.findFirst({
      where: {
        confessionId: id,
        userId: userId,
      }
    });

    if (isUpvoted && !existingUpvote) {
      // Create upvote
      await (prisma as any).upvote.create({
        data: {
          confessionId: id,
          userId: userId,
        }
      });

      // Notification to confession owner (if not self)
      try {
        const conf = await (prisma as any).confession.findUnique({
          where: { id },
          select: { userId: true, slug: true, title: true }
        });
        if (conf && conf.userId !== userId) {
          await (prisma as any).notification.create({
            data: {
              type: 'upvote_confession',
              recipientId: conf.userId,
              actorId: userId,
              title: 'Seu desabafo recebeu um upvote',
              description: conf.title,
              url: `/confession/${conf.slug}`,
              confessionId: id,
            }
          });
        }
      } catch {}
    } else if (!isUpvoted && existingUpvote) {
      // Remove upvote
      await (prisma as any).upvote.delete({
        where: {
          id: existingUpvote.id,
        }
      });
    }

    return reply.status(200).send({ success: true });
  } catch (err) {
    req.log.error({ err }, "upvote confession error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const createComment = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const { confessionId, comment, parentId } = req.body as { confessionId: string; comment: string; parentId?: string };

    if (!confessionId || !comment) {
      return reply.status(400).send({ message: "confessionId and comment are required" });
    }

    // Enforce max length (plain text) for comments
    try {
      const plain = String(comment || "").replace(/<[^>]*>/g, "").trim();
      if (plain.length < 1) {
        return reply.status(400).send({ message: "comment_is_required" });
      }
      if (plain.length > 800) {
        return reply.status(400).send({ message: "comment_too_long" });
      }
    } catch {}

    const newComment = await (prisma as any).comment.create({
      data: {
        confessionId: confessionId,
        userId: userId,
        comment: comment,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        }
      }
    });

    // Notifications
    try {
      const conf = await (prisma as any).confession.findUnique({
        where: { id: confessionId },
        select: { userId: true, slug: true, title: true }
      });
      if (parentId) {
        // Reply → notify parent comment owner
        const parent = await (prisma as any).comment.findUnique({ where: { id: parentId }, select: { userId: true } });
        if (parent && parent.userId !== userId) {
          await (prisma as any).notification.create({
            data: {
              type: 'reply',
              recipientId: parent.userId,
              actorId: userId,
              title: 'Você recebeu uma resposta',
              description: conf?.title || undefined,
              url: conf ? `/confession/${conf.slug}` : '/confession',
              confessionId: confessionId,
              commentId: newComment.id,
            }
          });
        }
      } else if (conf && conf.userId !== userId) {
        // Top-level comment → notify confession owner
        await (prisma as any).notification.create({
          data: {
            type: 'comment',
            recipientId: conf.userId,
            actorId: userId,
            title: 'Novo comentário no seu desabafo',
            description: conf.title,
            url: `/confession/${conf.slug}`,
            confessionId: confessionId,
            commentId: newComment.id,
          }
        });
      }
    } catch {}

    return reply.status(201).send({ comment: newComment });
  } catch (err) {
    req.log.error({ err }, "create comment error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const getComments = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { confessionId, page = "1", limit = "100", order = "desc" } = req.query as { confessionId?: string; page?: string; limit?: string; order?: "asc" | "desc" };
    
    if (!confessionId) {
      return reply.status(400).send({ message: "confessionId is required" });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const comments = await (prisma as any).comment.findMany({
      where: {
        confessionId: confessionId,
        parentId: null, // Only top-level comments
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: order === "asc" ? "asc" : "desc" },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: {
            replies: true,
          }
        }
      }
    });

    const total = await (prisma as any).comment.count({
      where: {
        confessionId: confessionId,
        parentId: null,
      }
    });

    return reply.status(200).send({
      comments: comments.map((comment: any) => ({
        id: comment.id,
        comment: comment.comment,
        createdAt: comment.createdAt,
        user: comment.user,
        upvotes: 0, // TODO: implement upvotes for comments
        replies: comment.replies || [],
        repliesCount: comment._count.replies,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        order,
      }
    });
  } catch (err) {
    req.log.error({ err }, "get comments error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const upvoteComment = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const { id } = req.params as { id: string };
    const { isUpvoted } = req.body as { isUpvoted: boolean };

    // Check if upvote already exists
    const existingUpvote = await (prisma as any).commentUpvote.findFirst({
      where: {
        commentId: id,
        userId: userId,
      }
    });

    if (isUpvoted && !existingUpvote) {
      // Create upvote
      await (prisma as any).commentUpvote.create({
        data: {
          commentId: id,
          userId: userId,
        }
      });

      // Notify comment owner (if not self)
      try {
        const c = await (prisma as any).comment.findUnique({
          where: { id },
          select: { userId: true, confessionId: true }
        });
        if (c && c.userId !== userId) {
          const conf = await (prisma as any).confession.findUnique({ where: { id: c.confessionId }, select: { slug: true, title: true } });
          await (prisma as any).notification.create({
            data: {
              type: 'upvote_comment',
              recipientId: c.userId,
              actorId: userId,
              title: 'Seu comentário recebeu um upvote',
              description: conf?.title || undefined,
              url: conf ? `/confession/${conf.slug}` : '/confession',
              confessionId: c.confessionId,
              commentId: id,
            }
          });
        }
      } catch {}
    } else if (!isUpvoted && existingUpvote) {
      // Remove upvote
      await (prisma as any).commentUpvote.delete({
        where: {
          id: existingUpvote.id,
        }
      });
    }

    return reply.status(200).send({ success: true });
  } catch (err) {
    req.log.error({ err }, "upvote comment error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const updateComment = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const { id } = req.params as { id: string };
    const { comment } = req.body as { comment: string };

    if (!comment || comment.trim().length === 0) {
      return reply.status(400).send({ message: "comment_is_required" });
    }

    const existing = await (prisma as any).comment.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ message: "comment_not_found" });
    }
    if (existing.userId !== userId) {
      return reply.status(403).send({ message: "forbidden" });
    }

    const updated = await (prisma as any).comment.update({
      where: { id },
      data: { comment },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } }
      }
    });

    return reply.status(200).send({ comment: updated });
  } catch (err) {
    (req as any).log?.error({ err }, "update comment error");
    return reply.status(500).send({ message: "internal_error" });
  }
};
