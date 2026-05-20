import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Enums:', (prisma as any)._enum);
  try {
    const session = await prisma.gameSession.create({
      data: {
        phase: 'EXPLORING',
        playerClass: 'BERSERKER',
        deck: {
          create: [{ element: 'WATER', rank: 1 }]
        }
      }
    });
    console.log('Success:', session.id);
    await prisma.gameSession.delete({ where: { id: session.id } });
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
