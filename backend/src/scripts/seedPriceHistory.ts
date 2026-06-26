import mongoose from "mongoose";
import dotenv from "dotenv";
import Phone from "../models/Phone";
import PriceHistory from "../models/PriceHistory";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const MONGO_URI = process.env.MONGO_URI as string;

const HISTORY_MONTHS = 6;
const MOCK_SOURCE = "mock-seed";

const generateIntelligentHistory = (phone: any) => {
  const points: any[] = [];
  const now = new Date();
  const msrp = Number(phone.price);
  const releaseDate = new Date(phone.releaseDate || now);

  const ageInDays = (now.getTime() - releaseDate.getTime()) / (1000 * 3600 * 24);

  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(now.getMonth() - i);

    let amount: number = msrp;

    // New phones stay at MSRP
    if (ageInDays < 60) {
      amount = msrp;
    } else {
      // Older phones have a higher chance of a deeper discount
      const saleChance = ageInDays > 180 ? 0.4 : 0.2; // 40% vs 20% chance
      const maxDiscount = ageInDays > 180 ? 0.3 : 0.15; // Max 30% vs 15% drop

      if (Math.random() < saleChance) {
        const discountFactor = 0.05 + Math.random() * (maxDiscount - 0.05);
        amount = msrp * (1 - discountFactor);
      } else {
        amount = msrp;
      }
    }

    points.push({
      amount: Math.round(amount),
      recordedAt: date,
    });
  }
  return points;
};

const seed = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);

    // --- THE CLEAR ---
    //console.log(`Deleting old '${MOCK_SOURCE}' records...`);
    //const result = await PriceHistory.deleteMany({ source: MOCK_SOURCE });
    //console.log(`Deleted ${result.deletedCount} records.`);

    const phones = await Phone.find({});
    console.log(`Analyzing ${phones.length} phones...`);

    const allDocs: any[] = [];

    for (const phone of phones) {
      const msrp = Number(phone.price);
      if (!msrp || msrp <= 0) continue;

      const history = generateIntelligentHistory(phone);

      history.forEach((h) => {
        allDocs.push({
          phoneId: phone.id,
          amount: h.amount,
          currency: "USD",
          source: MOCK_SOURCE,
          raw: `$${h.amount}`,
          recordedAt: h.recordedAt,
        });
      });
    }

    if (allDocs.length > 0) {
      await PriceHistory.insertMany(allDocs);
      console.log(`Success: Generated ${allDocs.length} price history.`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Seeder failed:", err);
    process.exit(1);
  }
};

seed();
