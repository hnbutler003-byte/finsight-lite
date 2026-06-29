import { db } from "../server/db";
import {
  users, userXp, userLearningProgress, gameSessions, savingsGoals,
  classEnrollments,
} from "../shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { enrollStudentInOrg } from "../server/supabase";

const DEMO_ORG_ID = "e8401186-bb8e-4456-b030-a55de5a6960f";
const DEMO_ENV_ID = "c14140df-2f66-4cbe-b075-dbcc3e50bca4";
const CLASS_A_ID = 2;

const newStudents = [
  { id: "demo-test-s009", firstName: "Tyriq",    username: "Tyriq_Demo",    avatar: "lion"    },
  { id: "demo-test-s010", firstName: "Anaya",    username: "Anaya_Demo",    avatar: "dolphin" },
  { id: "demo-test-s011", firstName: "Kemar",    username: "KemarJ_Demo",   avatar: "parrot"  },
  { id: "demo-test-s012", firstName: "Shanice",  username: "Shanice_Demo",  avatar: "turtle"  },
  { id: "demo-test-s013", firstName: "Omari",    username: "Omari_Demo",    avatar: "crab"    },
  { id: "demo-test-s014", firstName: "Nyasha",   username: "Nyasha_Demo",   avatar: "owl"     },
  { id: "demo-test-s015", firstName: "Jadon",    username: "Jadon_Demo",    avatar: "rocket"  },
  { id: "demo-test-s016", firstName: "Adaeze",   username: "Adaeze_Demo",   avatar: "star"    },
  { id: "demo-test-s017", firstName: "Tremaine", username: "Tremaine_Demo", avatar: "lion"    },
  { id: "demo-test-s018", firstName: "Kishma",   username: "Kishma_Demo",   avatar: "dolphin" },
  { id: "demo-test-s019", firstName: "Delano",   username: "Delano_Demo",   avatar: "parrot"  },
  { id: "demo-test-s020", firstName: "Sasha",    username: "Sasha_Demo",    avatar: "turtle"  },
  { id: "demo-test-s021", firstName: "Kofi",     username: "Kofi_Demo",     avatar: "crab"    },
  { id: "demo-test-s022", firstName: "Ria",      username: "Ria_Demo",      avatar: "owl"     },
  { id: "demo-test-s023", firstName: "Brendan",  username: "Brendan_Demo",  avatar: "rocket"  },
  { id: "demo-test-s024", firstName: "Janae",    username: "Janae_Demo",    avatar: "star"    },
  { id: "demo-test-s025", firstName: "Devonte",  username: "Devonte_Demo",  avatar: "lion"    },
  { id: "demo-test-s026", firstName: "Alicia",   username: "Alicia_Demo",   avatar: "dolphin" },
  { id: "demo-test-s027", firstName: "Rashida",  username: "Rashida_Demo",  avatar: "parrot"  },
  { id: "demo-test-s028", firstName: "Tamika",   username: "Tamika_Demo",   avatar: "turtle"  },
  { id: "demo-test-s029", firstName: "Zion",     username: "Zion_Demo",     avatar: "crab"    },
  { id: "demo-test-s030", firstName: "Indira",   username: "Indira_Demo",   avatar: "owl"     },
];

const xpRange = [
  { xp: 480, level: 4, streak: 8,  lessons: [1,2,3,4,5] },
  { xp: 320, level: 3, streak: 4,  lessons: [1,2,3,4]   },
  { xp: 150, level: 2, streak: 1,  lessons: [1,2]        },
  { xp: 550, level: 5, streak: 11, lessons: [1,2,3,4,5,6]},
  { xp: 200, level: 2, streak: 2,  lessons: [1,2,3]      },
  { xp: 410, level: 4, streak: 6,  lessons: [1,2,3,4,5]  },
  { xp: 95,  level: 1, streak: 0,  lessons: [1]          },
  { xp: 360, level: 4, streak: 5,  lessons: [1,2,3,4]    },
  { xp: 600, level: 5, streak: 14, lessons: [1,2,3,4,5,6]},
  { xp: 240, level: 3, streak: 3,  lessons: [1,2,3]      },
  { xp: 125, level: 2, streak: 1,  lessons: [1,2]        },
  { xp: 470, level: 4, streak: 7,  lessons: [1,2,3,4,5]  },
  { xp: 310, level: 3, streak: 4,  lessons: [1,2,3,4]    },
  { xp: 80,  level: 1, streak: 0,  lessons: [1]          },
  { xp: 530, level: 5, streak: 10, lessons: [1,2,3,4,5,6]},
  { xp: 175, level: 2, streak: 2,  lessons: [1,2]        },
  { xp: 390, level: 4, streak: 6,  lessons: [1,2,3,4,5]  },
  { xp: 270, level: 3, streak: 3,  lessons: [1,2,3]      },
  { xp: 450, level: 4, streak: 8,  lessons: [1,2,3,4,5]  },
  { xp: 110, level: 1, streak: 0,  lessons: [1]          },
  { xp: 340, level: 3, streak: 5,  lessons: [1,2,3,4]    },
  { xp: 620, level: 5, streak: 15, lessons: [1,2,3,4,5,6]},
];

const goalTemplates = [
  { name: "New sneakers",          target: "150.00", current: "142.50", icon: "shoe",  color: "#6366f1" },
  { name: "School supplies",       target: "80.00",  current: "60.00",  icon: "book",  color: "#14b8a6" },
  { name: "Carnival costume fund", target: "200.00", current: "50.00",  icon: "star",  color: "#f59e0b" },
  { name: "New phone",             target: "500.00", current: "500.00", icon: "phone", color: "#22c55e" },
  { name: "Weekend trip fund",     target: "120.00", current: "30.00",  icon: "plane", color: "#ec4899" },
  { name: "Birthday gift fund",    target: "60.00",  current: "45.00",  icon: "gift",  color: "#8b5cf6" },
  { name: "Sports gear",           target: "250.00", current: "0.00",   icon: "ball",  color: "#f97316" },
  { name: "Music lessons",         target: "300.00", current: "180.00", icon: "music", color: "#3b82f6" },
];

async function main() {
  console.log("Seeding extended QA data...");
  console.log("Adding 22 students to Class A (id=%d)...", CLASS_A_ID);

  for (let i = 0; i < newStudents.length; i++) {
    const s = newStudents[i];
    const prog = xpRange[i % xpRange.length];

    const [existingUser] = await db.select().from(users).where(eq(users.id, s.id));
    if (!existingUser) {
      await db.insert(users).values({ id: s.id, firstName: s.firstName, username: s.username, avatar: s.avatar } as any);
      console.log("  Created user", s.firstName);
    } else {
      console.log("  User already exists:", s.firstName);
    }

    const [enrolled] = await db.select().from(classEnrollments)
      .where(and(eq(classEnrollments.classId, CLASS_A_ID), eq(classEnrollments.studentId, s.id)));
    if (!enrolled) {
      await db.insert(classEnrollments).values({ classId: CLASS_A_ID, studentId: s.id });
    }

    const orgResult = await enrollStudentInOrg(DEMO_ORG_ID, DEMO_ENV_ID, s.id);
    if (!orgResult.success) {
      console.warn("  Org enroll failed for", s.firstName, "(may already be enrolled)");
    }

    const [alreadyXp] = await db.select().from(userXp).where(eq(userXp.userId, s.id));
    if (!alreadyXp) {
      await db.insert(userXp).values({
        userId: s.id, totalXp: prog.xp, level: prog.level,
        currentStreak: prog.streak, longestStreak: prog.streak,
      });
    }

    for (const moduleId of prog.lessons) {
      const [alreadyLesson] = await db.select().from(userLearningProgress)
        .where(and(eq(userLearningProgress.userId, s.id), eq(userLearningProgress.moduleId, moduleId)));
      if (!alreadyLesson) {
        await db.insert(userLearningProgress).values({ userId: s.id, moduleId, completed: true });
      }
    }

    const [alreadySession] = await db.select().from(gameSessions).where(eq(gameSessions.userId, s.id));
    if (!alreadySession) {
      await db.insert(gameSessions).values({
        userId: s.id, mode: "quiz", score: prog.xp,
        correctAnswers: Math.floor(prog.xp / 60), totalQuestions: 10,
      });
    }
  }

  console.log("Adding savings goals for all 30 demo students...");
  const allDemoIds = [
    "demo-test-s001","demo-test-s002","demo-test-s003",
    "demo-test-s004","demo-test-s005","demo-test-s006",
    "demo-test-s007","demo-test-s008",
    ...newStudents.map(s => s.id),
  ];

  const deadline2025 = new Date("2025-12-31T00:00:00Z");

  for (let i = 0; i < allDemoIds.length; i++) {
    const userId = allDemoIds[i];
    const existingGoals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
    if (existingGoals.length > 0) {
      console.log("  Goals already exist for", userId);
      continue;
    }
    const g1 = goalTemplates[i % goalTemplates.length];
    const g2 = goalTemplates[(i + 3) % goalTemplates.length];
    await db.insert(savingsGoals).values([
      { userId, name: g1.name, targetAmount: g1.target, currentAmount: g1.current, currency: "BSD", deadline: deadline2025, icon: g1.icon, color: g1.color },
      { userId, name: g2.name, targetAmount: g2.target, currentAmount: g2.current, currency: "BSD", deadline: deadline2025, icon: g2.icon, color: g2.color },
    ] as any);
    console.log("  Added goals for", userId);
  }

  const count = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, CLASS_A_ID));
  console.log(`\nClass A now has ${count.length} enrolled students.`);
  console.log("Done!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
