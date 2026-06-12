"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Apple,
  ArrowLeft,
  ChevronRight,
  Clock,
  Droplets,
  Flame,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FOOD_DATABASE,
  FOOD_CATEGORIES,
  searchFood,
  getFoodByCategory,
  calculateNutrition,
  type FoodItem,
  type FoodCategory,
} from "@/lib/sport/food-database";

interface LoggedMeal {
  id: string;
  food: FoodItem;
  grams: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  time: string;
}

/**
 * MediSport — Food Logger
 *
 * Features:
 * - Arabic food database search (50+ Gulf/Arab foods)
 * - Meal logging with portion control
 * - Daily macro tracking (calories, protein, carbs, fat)
 * - Water intake tracker
 * - Meal type categorization (breakfast, lunch, dinner, snack)
 */
export default function FoodLoggerPage() {
  const t = useTranslations("SportStandalone");
  const tFood = useTranslations("SportFood");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<FoodCategory | null>(null);
  const [loggedMeals, setLoggedMeals] = React.useState<LoggedMeal[]>([]);
  const [waterGlasses, setWaterGlasses] = React.useState(4);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [selectedFood, setSelectedFood] = React.useState<FoodItem | null>(null);
  const [portionGrams, setPortionGrams] = React.useState(100);
  const [mealType, setMealType] = React.useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");

  // Daily targets
  const targets = { calories: 2200, protein: 150, carbs: 250, fat: 70 };

  // Load today's persisted meals from the shared MediSport API
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/sport?action=my-food-logs");
        if (!res.ok) return; // not signed in / no data
        const json = await res.json();
        if (!active || !json.success || !Array.isArray(json.data)) return;
        const restored: LoggedMeal[] = json.data
          .map((row: Record<string, unknown>) => {
            const food = FOOD_DATABASE.find((f) => f.id === row.foodId);
            if (!food) return null;
            return {
              id: String(row.id),
              food,
              grams: Number(row.grams),
              mealType: row.mealType as LoggedMeal["mealType"],
              time: new Date(String(row.createdAt)).toLocaleTimeString(
                locale === "ar" ? "ar-SA" : "en-US",
                { hour: "2-digit", minute: "2-digit" }
              ),
            } as LoggedMeal;
          })
          .filter(Boolean) as LoggedMeal[];
        setLoggedMeals(restored);
      } catch {
        /* offline / anonymous — keep local state */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate daily totals
  const dailyTotals = React.useMemo(() => {
    return loggedMeals.reduce(
      (acc, meal) => {
        const nutrition = calculateNutrition(meal.food, meal.grams);
        return {
          calories: acc.calories + nutrition.calories,
          protein: acc.protein + nutrition.protein,
          carbs: acc.carbs + nutrition.carbs,
          fat: acc.fat + nutrition.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [loggedMeals]);

  // Search handler
  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      setSearchResults(searchFood(searchQuery, locale as "ar" | "en"));
      setSelectedCategory(null);
    } else if (searchQuery.length === 0) {
      setSearchResults([]);
    }
  }, [searchQuery, locale]);

  const handleCategorySelect = (cat: FoodCategory) => {
    setSelectedCategory(cat);
    setSearchResults(getFoodByCategory(cat));
    setSearchQuery("");
  };

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    setPortionGrams(food.servingSize);
    setShowAddModal(true);
  };

  const handleAddMeal = async () => {
    if (!selectedFood) return;
    const food = selectedFood;
    const grams = portionGrams;
    const mt = mealType;
    const newMeal: LoggedMeal = {
      id: Date.now().toString(),
      food,
      grams,
      mealType: mt,
      time: new Date().toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    // Optimistic update
    setLoggedMeals((prev) => [...prev, newMeal]);
    setShowAddModal(false);
    setSelectedFood(null);
    // Persist to shared MediSport API (server keeps the source of truth)
    try {
      const res = await fetch("/api/sport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "food-log", foodId: food.id, grams, mealType: mt }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        // Replace temp id with the DB id
        setLoggedMeals((prev) =>
          prev.map((m) => (m.id === newMeal.id ? { ...m, id: String(json.data.id) } : m))
        );
      }
    } catch {
      /* offline — meal stays in local state */
    }
  };

  const handleRemoveMeal = (id: string) => {
    setLoggedMeals((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/sport/trainee`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className={`h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tFood("title")}</h1>
          <p className="text-sm text-slate-500">{tFood("subtitle")}</p>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <MacroCard
          label={tFood("calories")}
          value={dailyTotals.calories}
          target={targets.calories}
          unit="kcal"
          color="orange"
        />
        <MacroCard
          label={tFood("protein")}
          value={dailyTotals.protein}
          target={targets.protein}
          unit="g"
          color="red"
        />
        <MacroCard
          label={tFood("carbs")}
          value={dailyTotals.carbs}
          target={targets.carbs}
          unit="g"
          color="blue"
        />
        <MacroCard
          label={tFood("fat")}
          value={dailyTotals.fat}
          target={targets.fat}
          unit="g"
          color="yellow"
        />
      </div>

      {/* Water Tracker */}
      <Card className="border-blue-100 bg-blue-50/30 mb-4">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">{tFood("water")}</span>
              <span className="text-xs text-slate-500">{waterGlasses}/8</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex gap-0.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 w-2 rounded-full transition-colors ${
                      i < waterGlasses ? "bg-blue-500" : "bg-blue-200"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => setWaterGlasses(Math.min(8, waterGlasses + 1))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Log / Search */}
      <Tabs defaultValue="log" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-lg p-1 w-full">
          <TabsTrigger value="log" className="flex-1 rounded-md text-sm">
            <Clock className="h-3.5 w-3.5 me-1.5" />
            {tFood("todayLog")}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1 rounded-md text-sm">
            <Search className="h-3.5 w-3.5 me-1.5" />
            {tFood("addFood")}
          </TabsTrigger>
        </TabsList>

        {/* Today's Log */}
        <TabsContent value="log" className="space-y-3">
          {loggedMeals.length === 0 ? (
            <Card className="border-dashed border-slate-200">
              <CardContent className="p-8 text-center">
                <Utensils className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{tFood("emptyLog")}</p>
                <p className="text-xs text-slate-400 mt-1">{tFood("emptyLogHint")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => {
                const meals = loggedMeals.filter((m) => m.mealType === type);
                if (meals.length === 0) return null;
                return (
                  <div key={type}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                      {tFood(type)}
                    </h3>
                    <div className="space-y-2">
                      {meals.map((meal) => {
                        const nutrition = calculateNutrition(meal.food, meal.grams);
                        return (
                          <Card key={meal.id} className="border-slate-100">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900">
                                      {locale === "ar" ? meal.food.nameAr : meal.food.nameEn}
                                    </span>
                                    <span className="text-xs text-slate-400">{meal.grams}g</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                    <span>{nutrition.calories} kcal</span>
                                    <span>P: {nutrition.protein}g</span>
                                    <span>C: {nutrition.carbs}g</span>
                                    <span>F: {nutrition.fat}g</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">{meal.time}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                                    onClick={() => handleRemoveMeal(meal.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Search & Add */}
        <TabsContent value="search" className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tFood("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 rounded-lg"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categories */}
          {!searchQuery && !selectedCategory && (
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FOOD_CATEGORIES) as [FoodCategory, { ar: string; en: string; icon: string }][]).map(
                ([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => handleCategorySelect(key)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors text-start"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700">
                      {locale === "ar" ? cat.ar : cat.en}
                    </span>
                  </button>
                )
              )}
            </div>
          )}

          {/* Category back button */}
          {selectedCategory && (
            <button
              onClick={() => { setSelectedCategory(null); setSearchResults([]); }}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
            >
              <ArrowLeft className={`h-3 w-3 ${isRtl ? "rotate-180" : ""}`} />
              {tFood("allCategories")}
            </button>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {searchResults.map((food) => (
                <button
                  key={food.id}
                  onClick={() => handleFoodSelect(food)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors text-start"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      {locale === "ar" ? food.nameAr : food.nameEn}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {food.calories} kcal/100g
                      </span>
                      <span className="text-[10px] text-slate-400">
                        P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                      </span>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-emerald-500" />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Food Modal */}
      {showAddModal && selectedFood && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-0 shadow-2xl rounded-t-2xl sm:rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">
                  {locale === "ar" ? selectedFood.nameAr : selectedFood.nameEn}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Portion Size */}
              <div className="space-y-3 mb-4">
                <label className="text-sm font-medium text-slate-700">{tFood("portion")}</label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setPortionGrams(Math.max(10, portionGrams - 10))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <Input
                      type="number"
                      value={portionGrams}
                      onChange={(e) => setPortionGrams(Number(e.target.value))}
                      className="text-center text-lg font-bold rounded-lg"
                    />
                    <span className="text-xs text-slate-500">{tFood("grams")}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setPortionGrams(portionGrams + 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Quick portions */}
                <div className="flex gap-2 flex-wrap">
                  {[50, 100, 150, 200, selectedFood.servingSize].filter((v, i, a) => a.indexOf(v) === i).map((g) => (
                    <button
                      key={g}
                      onClick={() => setPortionGrams(g)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        portionGrams === g
                          ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition Preview */}
              {(() => {
                const n = calculateNutrition(selectedFood, portionGrams);
                return (
                  <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-slate-50 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-bold text-orange-600">{n.calories}</div>
                      <div className="text-[10px] text-slate-500">kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-red-600">{n.protein}g</div>
                      <div className="text-[10px] text-slate-500">{tFood("protein")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-600">{n.carbs}g</div>
                      <div className="text-[10px] text-slate-500">{tFood("carbs")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-yellow-600">{n.fat}g</div>
                      <div className="text-[10px] text-slate-500">{tFood("fat")}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Meal Type */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium text-slate-700">{tFood("mealType")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMealType(type)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        mealType === type
                          ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200"
                      }`}
                    >
                      {tFood(type)}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddMeal}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg h-11"
              >
                <Plus className="h-4 w-4 me-2" />
                {tFood("addToLog")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function MacroCard({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const percentage = Math.min(100, Math.round((value / target) * 100));
  const colorMap: Record<string, string> = {
    orange: "text-orange-600",
    red: "text-red-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
  };
  const bgMap: Record<string, string> = {
    orange: "bg-orange-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
  };

  return (
    <Card className="border-slate-100">
      <CardContent className="p-2 text-center">
        <div className={`text-sm font-bold ${colorMap[color]}`}>
          {Math.round(value)}
        </div>
        <div className="text-[9px] text-slate-400">/{target}{unit}</div>
        <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
          <div
            className={`h-full rounded-full ${bgMap[color]} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}
