const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const session = await prisma.gameSession.create({
      data: {
        phase: 'EXPLORING',
        playerClass: 'BERSERKER',
        deck: {
          create: [{ element: 'WATER', rank: 1, maxUses: 3, currentUses: 3 }]
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
