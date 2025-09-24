import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/db";
import { generateToken, verifyToken } from "../utils/jwt";

type LoginBody = {
  ip?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  userAgent?: string;
  screen?: string;
  country?: string;
  state?: string;
  city?: string;
  avatarUrl?: string;
};

async function generateNextNickname(): Promise<string> {
  // Attempt sequential nicknames: anonimo#1, anonimo#2, ...
  let suffix = await (prisma as any).user.count();
  if (suffix < 1) suffix = 1; else suffix = suffix + 1;
  // Ensure uniqueness in case of concurrent creations
  // Try up to 100 increments to avoid infinite loops
  for (let i = 0; i < 100; i++) {
    const candidate = `anonimo#${suffix + i}`;
    const exists = await (prisma as any).user.findUnique({ where: { nickname: candidate } });
    if (!exists) return candidate;
  }
  // Fallback to a random suffix
  return `anonimo#${Math.floor(1000 + Math.random() * 9000)}`;
}

export const checkuser = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = (req.headers["authorization"] || req.headers["Authorization"]) as string | undefined;
    let userIdFromToken: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length);
      try {
        const payload = verifyToken(token) as { userId?: string };
        if (payload?.userId) userIdFromToken = payload.userId;
      } catch {
        // ignore invalid tokens; we'll create a new session
      }
    }

    const body = (req.body || {}) as LoginBody;
    const requestIp = (req.ip as string) || body.ip || undefined;

    let user = userIdFromToken
      ? await (prisma as any).user.findUnique({ where: { id: userIdFromToken } })
      : null;

    if (!user) {
      // Create new anonymous user
      const nickname = await generateNextNickname();
      user = await (prisma as any).user.create({
        data: {
          nickname,
          ip: requestIp,
          platform: body.platform,
          country: body.country,
          state: body.state,
          city: body.city,
          avatarUrl: body.avatarUrl,
          language: body.language,
          userAgent: body.userAgent,
          timezone: body.timezone,
          screen: body.screen,
        },
      });
    } else {
      // Light update of metadata on existing user - only update if new data is provided
      const updateData: any = {};
      
      if (requestIp && requestIp !== user.ip) updateData.ip = requestIp;
      if (body.platform && body.platform !== user.platform) updateData.platform = body.platform;
      if (body.country && body.country !== user.country) updateData.country = body.country;
      if (body.state && body.state !== user.state) updateData.state = body.state;
      if (body.city && body.city !== user.city) updateData.city = body.city;
      if (body.avatarUrl && body.avatarUrl !== user.avatarUrl) updateData.avatarUrl = body.avatarUrl;
      if (body.language && body.language !== user.language) updateData.language = body.language;
      if (body.userAgent && body.userAgent !== user.userAgent) updateData.userAgent = body.userAgent;
      if (body.timezone && body.timezone !== user.timezone) updateData.timezone = body.timezone;
      if (body.screen && body.screen !== user.screen) updateData.screen = body.screen;
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        user = await (prisma as any).user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    const token = generateToken(user.id);

    return reply.status(200).send({
      token,
      user,
    });
  } catch (err) {
    req.log.error({ err }, "checkuser error");
    return reply.status(500).send({ message: "internal_error" });
  }
};

export const me = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = (req.headers["authorization"] || req.headers["Authorization"]) as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ message: "unauthorized" });
    }

    const token = authHeader.substring("Bearer ".length);
    const payload = verifyToken(token) as { userId?: string };
    if (!payload?.userId) {
      return reply.status(401).send({ message: "invalid_token" });
    }

    // Get user with statistics
    const user = await (prisma as any).user.findUnique({
      where: { id: payload.userId },
      include: {
        confessions: {
          select: {
            id: true,
          }
        },
        Upvotes: {
          select: {
            id: true,
          }
        },
        Communities: {
          select: {
            id: true,
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({ message: "user_not_found" });
    }

    // Calculate statistics
    const totalConfessions = user.confessions.length;
    const totalUpvotes = user.Upvotes.length; // Count of upvotes given by user
    const totalCommunities = user.Communities.length;

    return reply.status(200).send({
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        ip: user.ip,
        platform: user.platform,
        country: user.country,
        state: user.state,
        city: user.city,
        language: user.language,
        userAgent: user.userAgent,
        timezone: user.timezone,
        screen: user.screen,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats: {
          confessions: totalConfessions,
          upvotes: totalUpvotes,
          communities: totalCommunities,
        }
      }
    });
  } catch (err) {
    req.log.error({ err }, "me endpoint error");
    return reply.status(500).send({ message: "internal_error" });
  }
};
