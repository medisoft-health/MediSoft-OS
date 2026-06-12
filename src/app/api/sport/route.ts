import { NextRequest, NextResponse } from "next/server";
import {
  calculateBioAge,
  type BioAgeInputs,
} from "@/lib/sport/bio-age-calculator";
import {
  searchFood,
  getFoodByCategory,
  calculateNutrition,
  FOOD_DATABASE,
  type FoodCategory,
} from "@/lib/sport/food-database";

/**
 * MediSport Standalone API
 *
 * Unified API endpoint for all MediSport features.
 * Routes by `action` query parameter:
 *
 * GET:
 *   ?action=food-search&q=chicken&locale=ar
 *   ?action=food-category&category=protein
 *   ?action=food-all
 *   ?action=lessons
 *
 * POST:
 *   action: "bio-age" — Calculate biological age
 *   action: "food-log" — Log a meal
 *   action: "activity-log" — Log an activity session
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "food-search": {
        const query = searchParams.get("q") || "";
        const locale = (searchParams.get("locale") || "en") as "ar" | "en";
        const results = searchFood(query, locale);
        return NextResponse.json({
          success: true,
          data: results,
          count: results.length,
        });
      }

      case "food-category": {
        const category = searchParams.get("category") as FoodCategory;
        if (!category) {
          return NextResponse.json(
            { success: false, error: "Missing category parameter" },
            { status: 400 }
          );
        }
        const results = getFoodByCategory(category);
        return NextResponse.json({
          success: true,
          data: results,
          count: results.length,
        });
      }

      case "food-all": {
        return NextResponse.json({
          success: true,
          data: FOOD_DATABASE,
          count: FOOD_DATABASE.length,
        });
      }

      case "food-nutrition": {
        const foodId = searchParams.get("id");
        const grams = Number(searchParams.get("grams") || "100");
        const food = FOOD_DATABASE.find((f) => f.id === foodId);
        if (!food) {
          return NextResponse.json(
            { success: false, error: "Food item not found" },
            { status: 404 }
          );
        }
        const nutrition = calculateNutrition(food, grams);
        return NextResponse.json({
          success: true,
          data: { food, grams, nutrition },
        });
      }

      case "lessons": {
        // Return lesson catalog (in production, this would come from DB)
        return NextResponse.json({
          success: true,
          data: {
            categories: ["nutrition", "training", "recovery", "mindset", "injury_prevention"],
            totalLessons: 8,
            message: "Lesson content served client-side for Phase 2. Phase 3 will add DB-backed lessons.",
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Unknown action. Available: food-search, food-category, food-all, food-nutrition, lessons",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "bio-age": {
        const inputs = body.inputs as BioAgeInputs;
        if (!inputs) {
          return NextResponse.json(
            { success: false, error: "Missing inputs object" },
            { status: 400 }
          );
        }

        // Validate required fields
        const requiredFields: (keyof BioAgeInputs)[] = [
          "chronologicalAge", "sex", "height", "weight",
          "bodyFatPercentage", "muscleMass", "waistCircumference",
          "restingHeartRate", "systolicBP", "diastolicBP", "vo2Max",
          "fastingGlucose", "hba1c", "totalCholesterol",
          "sleepHours", "exerciseMinutesPerWeek",
        ];

        for (const field of requiredFields) {
          if (inputs[field] === undefined || inputs[field] === null) {
            return NextResponse.json(
              { success: false, error: `Missing required field: ${field}` },
              { status: 400 }
            );
          }
        }

        const result = calculateBioAge(inputs);
        return NextResponse.json({ success: true, data: result });
      }

      case "food-log": {
        const { foodId, grams, mealType, date } = body;
        if (!foodId || !grams || !mealType) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: foodId, grams, mealType" },
            { status: 400 }
          );
        }

        const food = FOOD_DATABASE.find((f) => f.id === foodId);
        if (!food) {
          return NextResponse.json(
            { success: false, error: "Food item not found" },
            { status: 404 }
          );
        }

        const nutrition = calculateNutrition(food, grams);

        // In production, this would save to database
        return NextResponse.json({
          success: true,
          data: {
            id: `log_${Date.now()}`,
            foodId,
            food: food,
            grams,
            mealType,
            date: date || new Date().toISOString(),
            nutrition,
          },
          message: "Meal logged successfully. Database persistence coming in Phase 3.",
        });
      }

      case "activity-log": {
        const { type, duration, distance, calories, route } = body;
        if (!type || !duration) {
          return NextResponse.json(
            { success: false, error: "Missing required fields: type, duration" },
            { status: 400 }
          );
        }

        // In production, this would save to database
        return NextResponse.json({
          success: true,
          data: {
            id: `activity_${Date.now()}`,
            type,
            duration,
            distance: distance || 0,
            calories: calories || 0,
            route: route || [],
            date: new Date().toISOString(),
          },
          message: "Activity logged successfully. Database persistence coming in Phase 3.",
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Unknown action. Available POST actions: bio-age, food-log, activity-log",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[MediSport API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
