import { PrismaClient, UserType, RoomType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create VIP superuser (FR-002)
  const hashedPassword = await bcrypt.hash('000000', 12);
  const superuser = await prisma.user.upsert({
    where: { username: 'superuser' },
    update: {},
    create: {
      username: 'superuser',
      passwordHash: hashedPassword,
      email: 'superuser@roombook.com',
      fullName: 'VIP Superuser',
      userType: UserType.VIP,
      rankingScore: 100,
    },
  });
  console.log('✓ Created VIP superuser:', superuser.username);

  // Create sample standard users
  const standardUsers = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { username: `user${i}` },
      update: {},
      create: {
        username: `user${i}`,
        passwordHash: await bcrypt.hash('password123', 12),
        email: `user${i}@roombook.com`,
        fullName: `Standard User ${i}`,
        userType: UserType.STANDARD,
        rankingScore: 100,
      },
    });
    standardUsers.push(user);
  }
  console.log(`✓ Created ${standardUsers.length} standard users`);

  // Create 8 normal rooms
  const normalRooms = [
    {
      name: 'Conference Room A',
      capacity: 8,
      equipment: ['projector', 'whiteboard', 'phone'],
      location: 'Floor 1, Wing A',
    },
    {
      name: 'Conference Room B',
      capacity: 6,
      equipment: ['whiteboard', 'phone'],
      location: 'Floor 1, Wing B',
    },
    {
      name: 'Meeting Room 101',
      capacity: 4,
      equipment: ['whiteboard'],
      location: 'Floor 1, East',
    },
    {
      name: 'Meeting Room 102',
      capacity: 4,
      equipment: ['whiteboard', 'phone'],
      location: 'Floor 1, East',
    },
    {
      name: 'Meeting Room 201',
      capacity: 6,
      equipment: ['projector', 'whiteboard', 'video_conferencing'],
      location: 'Floor 2, West',
    },
    {
      name: 'Meeting Room 202',
      capacity: 8,
      equipment: ['projector', 'whiteboard'],
      location: 'Floor 2, West',
    },
    {
      name: 'Team Room 301',
      capacity: 10,
      equipment: ['dual_screens', 'whiteboard', 'phone'],
      location: 'Floor 3, North',
    },
    {
      name: 'Collaboration Space',
      capacity: 12,
      equipment: ['projector', 'whiteboard', 'video_conferencing', 'phone'],
      location: 'Floor 3, South',
    },
  ];

  for (const roomData of normalRooms) {
    await prisma.room.upsert({
      where: { name: roomData.name },
      update: {},
      create: {
        ...roomData,
        roomType: RoomType.NORMAL,
        isActive: true,
      },
    });
  }
  console.log('✓ Created 8 normal rooms');

  // Create 2 VIP rooms
  const vipRooms = [
    {
      name: 'Executive Boardroom',
      capacity: 16,
      equipment: ['dual_screens', 'video_conferencing', 'whiteboard', 'phone', 'projector'],
      location: 'Floor 4, Executive Wing',
    },
    {
      name: 'VIP Conference Suite',
      capacity: 20,
      equipment: [
        'dual_screens',
        'video_conferencing',
        'whiteboard',
        'phone',
        'projector',
        'audio_system',
      ],
      location: 'Floor 4, Executive Wing',
    },
  ];

  for (const roomData of vipRooms) {
    await prisma.room.upsert({
      where: { name: roomData.name },
      update: {},
      create: {
        ...roomData,
        roomType: RoomType.VIP,
        isActive: true,
      },
    });
  }
  console.log('✓ Created 2 VIP rooms');

  console.log('✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
