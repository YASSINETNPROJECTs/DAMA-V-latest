import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo password shared by all seeded users (see README).
const DEMO_PASSWORD = "DamaDemo2026!";

const demoUsers = [
  { username: "nadia",   email: "nadia@dama.demo",   country: "DZ", role: "ADMIN"  as const, rating: 1480, level: 12 },
  { username: "yusuf",   email: "yusuf@dama.demo",   country: "TR", role: "PLAYER" as const, rating: 1355, level: 9  },
  { username: "amina",   email: "amina@dama.demo",   country: "MA", role: "PLAYER" as const, rating: 1290, level: 8  },
  { username: "karim",   email: "karim@dama.demo",   country: "EG", role: "PLAYER" as const, rating: 1210, level: 6  },
  { username: "leyla",   email: "leyla@dama.demo",   country: "AZ", role: "PLAYER" as const, rating: 1120, level: 4  },
  { username: "omar",    email: "omar@dama.demo",    country: "JO", role: "PLAYER" as const, rating: 1000, level: 1  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of demoUsers) {
    const wins = Math.floor((u.rating - 900) / 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        username: u.username,
        email: u.email,
        passwordHash,
        country: u.country,
        role: u.role,
        rating: u.rating,
        level: u.level,
        xp: u.level * 250,
        bio: `Demo ${u.role === "ADMIN" ? "admin" : "player"} account for DAMA Phase 1.`,
        profile: {
          create: {
            displayName: u.username.charAt(0).toUpperCase() + u.username.slice(1),
            tagline: "Climbing the ladder.",
          },
        },
        stats: {
          create: {
            wins,
            losses: Math.max(0, wins - 3),
            draws: 1,
            matchesPlayed: wins + Math.max(0, wins - 3) + 1,
            bestStreak: 5,
          },
        },
        ratingState: {
          create: {
            currentRating: u.rating,
            peakRating: u.rating + 40,
            gamesRated: wins + Math.max(0, wins - 3) + 1,
            lastChange: 0,
          },
        },
      },
    });
  }


  await prisma.paymentMethod.upsert({
    where: { code: "BINANCE_PAY_USDT" },
    update: {},
    create: { code: "BINANCE_PAY_USDT", type: "BINANCE_PAY", currency: "USDT", displayName: "Binance Pay · USDT", enabled: false },
  });
  await prisma.paymentMethod.upsert({
    where: { code: "CRYPTO_MANUAL_USDT_TRC20" },
    update: {},
    create: { code: "CRYPTO_MANUAL_USDT_TRC20", type: "CRYPTO_MANUAL", currency: "USDT", network: "TRC20", displayName: "USDT · TRC20 (Manual)", enabled: false },
  });

  await prisma.featureFlag.upsert({
    where: { key: "demo_mode" },
    update: {},
    create: { key: "demo_mode", enabled: true, description: "Phase 1 demo data enabled." },
  });
  await prisma.featureFlag.upsert({
    where: { key: "real_money" },
    update: {},
    create: { key: "real_money", enabled: false, description: "Real-money staking. DISABLED in Phase 1." },
  });

  await prisma.auditLog.create({
    data: { action: "SEED_DEMO_DATA", meta: { users: demoUsers.length } },
  });

  console.log(`Seeded ${demoUsers.length} demo users. Password for all: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
