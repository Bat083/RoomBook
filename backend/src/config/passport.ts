import { PassportStatic } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export function configurePassport(passport: PassportStatic): void {
  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          // Find user by username
          const user = await prisma.user.findUnique({
            where: { username },
          });

          if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          // Authentication successful
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          userType: true,
          rankingScore: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
