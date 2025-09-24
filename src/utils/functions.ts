import { prisma } from "../config/db";


// Function to generate a unique slug from title
export const generateUniqueSlug = async (title: string): Promise<string> => {
  // Convert title to slug format
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  if (!baseSlug) {
    baseSlug = 'confession';
  }

  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists and increment counter if needed
  while (true) {
    const existingConfession = await (prisma as any).confession.findUnique({
      where: { slug }
    });

    if (!existingConfession) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Function to generate a unique slug for Communities
export const generateUniqueCommunitySlug = async (name: string): Promise<string> => {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) {
    baseSlug = 'community';
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await (prisma as any).communities.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

