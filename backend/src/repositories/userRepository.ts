import { PrismaClient, User, UserType } from '@prisma/client';

const prisma = new PrismaClient();

export class UserRepository {
  // Find user by ID
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // Create new user
  async create(data: {
    username: string;
    passwordHash: string;
    email: string;
    fullName: string;
    userType: UserType;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  // Update user ranking score
  async updateRankingScore(userId: string, scoreDelta: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        rankingScore: {
          increment: scoreDelta,
        },
      },
    });
  }

  // Check if user is VIP
  async isVIP(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.userType === UserType.VIP;
  }
}
