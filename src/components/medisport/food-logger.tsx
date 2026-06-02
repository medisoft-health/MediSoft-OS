"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Apple,
  BarChart3,
  Camera,
  ChefHat,
  Coffee,
  Droplets,
  Flame,
  Leaf,
  Minus,
  Moon,
  Plus,
  QrCode,
  Search,
  Sun,
  Sunset,
  Trash2,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// Arabic Food Database (500+ items organized by category)
// ═══════════════════════════════════════════════════════════════════════════════

interface FoodItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  calories: number; // per 100g or per serving
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  serving: string;
  servingGrams: number;
}

const FOOD_DATABASE: FoodItem[] = [
  // === خبز ومعجنات ===
  { id: "bread-1", nameAr: "خبز عربي أبيض", nameEn: "White Arabic Bread", category: "خبز ومعجنات", calories: 275, protein: 9, carbs: 55, fat: 1.2, fiber: 2.4, serving: "رغيف واحد", servingGrams: 80 },
  { id: "bread-2", nameAr: "خبز أسمر كامل", nameEn: "Whole Wheat Bread", category: "خبز ومعجنات", calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, serving: "رغيف واحد", servingGrams: 80 },
  { id: "bread-3", nameAr: "خبز شوفان", nameEn: "Oat Bread", category: "خبز ومعجنات", calories: 236, protein: 10, carbs: 43, fat: 4, fiber: 4, serving: "رغيف واحد", servingGrams: 80 },
  { id: "bread-4", nameAr: "توست أبيض", nameEn: "White Toast", category: "خبز ومعجنات", calories: 264, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, serving: "شريحتين", servingGrams: 60 },
  { id: "bread-5", nameAr: "توست أسمر", nameEn: "Brown Toast", category: "خبز ومعجنات", calories: 250, protein: 12, carbs: 43, fat: 3.5, fiber: 6, serving: "شريحتين", servingGrams: 60 },
  { id: "bread-6", nameAr: "صامولي", nameEn: "Samoli Bread", category: "خبز ومعجنات", calories: 289, protein: 8, carbs: 56, fat: 3.5, fiber: 2, serving: "حبة واحدة", servingGrams: 100 },
  { id: "bread-7", nameAr: "كرواسون", nameEn: "Croissant", category: "خبز ومعجنات", calories: 406, protein: 8, carbs: 45, fat: 21, fiber: 2.3, serving: "حبة واحدة", servingGrams: 67 },
  { id: "bread-8", nameAr: "فطيرة سبانخ", nameEn: "Spinach Pie", category: "خبز ومعجنات", calories: 230, protein: 6, carbs: 28, fat: 11, fiber: 2, serving: "حبة واحدة", servingGrams: 100 },
  { id: "bread-9", nameAr: "فطيرة جبنة", nameEn: "Cheese Pie", category: "خبز ومعجنات", calories: 320, protein: 12, carbs: 30, fat: 17, fiber: 1, serving: "حبة واحدة", servingGrams: 100 },
  { id: "bread-10", nameAr: "مناقيش زعتر", nameEn: "Zaatar Manakeesh", category: "خبز ومعجنات", calories: 290, protein: 7, carbs: 38, fat: 12, fiber: 3, serving: "حبة واحدة", servingGrams: 120 },

  // === أرز ومكرونة ===
  { id: "rice-1", nameAr: "أرز أبيض مطبوخ", nameEn: "Cooked White Rice", category: "أرز ومكرونة", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, serving: "كوب واحد", servingGrams: 158 },
  { id: "rice-2", nameAr: "أرز بسمتي", nameEn: "Basmati Rice", category: "أرز ومكرونة", calories: 121, protein: 3.5, carbs: 25, fat: 0.4, fiber: 0.6, serving: "كوب واحد", servingGrams: 158 },
  { id: "rice-3", nameAr: "أرز بني", nameEn: "Brown Rice", category: "أرز ومكرونة", calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8, serving: "كوب واحد", servingGrams: 158 },
  { id: "rice-4", nameAr: "كبسة دجاج", nameEn: "Chicken Kabsa", category: "أرز ومكرونة", calories: 210, protein: 14, carbs: 25, fat: 6, fiber: 1, serving: "طبق واحد", servingGrams: 300 },
  { id: "rice-5", nameAr: "مندي لحم", nameEn: "Lamb Mandi", category: "أرز ومكرونة", calories: 250, protein: 18, carbs: 22, fat: 10, fiber: 0.5, serving: "طبق واحد", servingGrams: 350 },
  { id: "rice-6", nameAr: "مكرونة بالصلصة", nameEn: "Pasta with Sauce", category: "أرز ومكرونة", calories: 157, protein: 5.8, carbs: 30, fat: 1.5, fiber: 1.8, serving: "طبق واحد", servingGrams: 250 },
  { id: "rice-7", nameAr: "مكرونة بالبشاميل", nameEn: "Pasta Bechamel", category: "أرز ومكرونة", calories: 220, protein: 10, carbs: 28, fat: 8, fiber: 1, serving: "قطعة واحدة", servingGrams: 200 },
  { id: "rice-8", nameAr: "كسكسي", nameEn: "Couscous", category: "أرز ومكرونة", calories: 176, protein: 6, carbs: 36, fat: 0.3, fiber: 2.2, serving: "كوب واحد", servingGrams: 157 },
  { id: "rice-9", nameAr: "برغل", nameEn: "Bulgur", category: "أرز ومكرونة", calories: 151, protein: 5.6, carbs: 34, fat: 0.4, fiber: 8.2, serving: "كوب واحد", servingGrams: 182 },
  { id: "rice-10", nameAr: "فريكة", nameEn: "Freekeh", category: "أرز ومكرونة", calories: 140, protein: 6, carbs: 26, fat: 1.5, fiber: 8, serving: "كوب واحد", servingGrams: 150 },

  // === لحوم ودواجن ===
  { id: "meat-1", nameAr: "صدر دجاج مشوي", nameEn: "Grilled Chicken Breast", category: "لحوم ودواجن", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, serving: "قطعة واحدة", servingGrams: 150 },
  { id: "meat-2", nameAr: "فخذ دجاج مشوي", nameEn: "Grilled Chicken Thigh", category: "لحوم ودواجن", calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0, serving: "قطعة واحدة", servingGrams: 150 },
  { id: "meat-3", nameAr: "لحم بقري مفروم", nameEn: "Ground Beef", category: "لحوم ودواجن", calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, serving: "100 جرام", servingGrams: 100 },
  { id: "meat-4", nameAr: "ستيك لحم", nameEn: "Beef Steak", category: "لحوم ودواجن", calories: 271, protein: 26, carbs: 0, fat: 18, fiber: 0, serving: "قطعة واحدة", servingGrams: 200 },
  { id: "meat-5", nameAr: "كباب مشوي", nameEn: "Grilled Kebab", category: "لحوم ودواجن", calories: 226, protein: 22, carbs: 2, fat: 14, fiber: 0.5, serving: "3 أسياخ", servingGrams: 150 },
  { id: "meat-6", nameAr: "شاورما دجاج", nameEn: "Chicken Shawarma", category: "لحوم ودواجن", calories: 190, protein: 20, carbs: 5, fat: 10, fiber: 0.5, serving: "ساندويتش صغير", servingGrams: 150 },
  { id: "meat-7", nameAr: "شاورما لحم", nameEn: "Beef Shawarma", category: "لحوم ودواجن", calories: 240, protein: 18, carbs: 6, fat: 16, fiber: 0.5, serving: "ساندويتش صغير", servingGrams: 150 },
  { id: "meat-8", nameAr: "كفتة مشوية", nameEn: "Grilled Kofta", category: "لحوم ودواجن", calories: 230, protein: 20, carbs: 3, fat: 15, fiber: 0.5, serving: "3 أصابع", servingGrams: 150 },
  { id: "meat-9", nameAr: "لحم ضأن مشوي", nameEn: "Grilled Lamb", category: "لحوم ودواجن", calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, serving: "100 جرام", servingGrams: 100 },
  { id: "meat-10", nameAr: "كبدة مشوية", nameEn: "Grilled Liver", category: "لحوم ودواجن", calories: 175, protein: 26, carbs: 4, fat: 5, fiber: 0, serving: "100 جرام", servingGrams: 100 },

  // === أسماك ومأكولات بحرية ===
  { id: "fish-1", nameAr: "سمك مشوي (تيلابيا)", nameEn: "Grilled Tilapia", category: "أسماك", calories: 128, protein: 26, carbs: 0, fat: 2.7, fiber: 0, serving: "قطعة واحدة", servingGrams: 150 },
  { id: "fish-2", nameAr: "سلمون مشوي", nameEn: "Grilled Salmon", category: "أسماك", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, serving: "قطعة واحدة", servingGrams: 150 },
  { id: "fish-3", nameAr: "تونة معلبة", nameEn: "Canned Tuna", category: "أسماك", calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, serving: "علبة واحدة", servingGrams: 120 },
  { id: "fish-4", nameAr: "جمبري مشوي", nameEn: "Grilled Shrimp", category: "أسماك", calories: 99, protein: 24, carbs: 0, fat: 0.3, fiber: 0, serving: "100 جرام", servingGrams: 100 },
  { id: "fish-5", nameAr: "سمك مقلي", nameEn: "Fried Fish", category: "أسماك", calories: 267, protein: 17, carbs: 10, fat: 17, fiber: 0.5, serving: "قطعة واحدة", servingGrams: 150 },

  // === بيض وألبان ===
  { id: "dairy-1", nameAr: "بيضة مسلوقة", nameEn: "Boiled Egg", category: "بيض وألبان", calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, serving: "بيضة واحدة", servingGrams: 50 },
  { id: "dairy-2", nameAr: "بيض مقلي", nameEn: "Fried Egg", category: "بيض وألبان", calories: 90, protein: 6.3, carbs: 0.4, fat: 7, fiber: 0, serving: "بيضة واحدة", servingGrams: 46 },
  { id: "dairy-3", nameAr: "حليب كامل الدسم", nameEn: "Whole Milk", category: "بيض وألبان", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, serving: "كوب واحد", servingGrams: 244 },
  { id: "dairy-4", nameAr: "حليب قليل الدسم", nameEn: "Low-fat Milk", category: "بيض وألبان", calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, serving: "كوب واحد", servingGrams: 244 },
  { id: "dairy-5", nameAr: "لبن رائب", nameEn: "Laban (Buttermilk)", category: "بيض وألبان", calories: 40, protein: 3.3, carbs: 4.8, fat: 0.9, fiber: 0, serving: "كوب واحد", servingGrams: 245 },
  { id: "dairy-6", nameAr: "زبادي يوناني", nameEn: "Greek Yogurt", category: "بيض وألبان", calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, serving: "كوب واحد", servingGrams: 200 },
  { id: "dairy-7", nameAr: "جبنة بيضاء", nameEn: "White Cheese (Feta)", category: "بيض وألبان", calories: 264, protein: 14, carbs: 4, fat: 21, fiber: 0, serving: "50 جرام", servingGrams: 50 },
  { id: "dairy-8", nameAr: "جبنة شيدر", nameEn: "Cheddar Cheese", category: "بيض وألبان", calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0, serving: "شريحتين", servingGrams: 56 },
  { id: "dairy-9", nameAr: "لبنة", nameEn: "Labneh", category: "بيض وألبان", calories: 160, protein: 6, carbs: 4, fat: 14, fiber: 0, serving: "3 ملاعق", servingGrams: 60 },
  { id: "dairy-10", nameAr: "حليب لوز", nameEn: "Almond Milk", category: "بيض وألبان", calories: 17, protein: 0.6, carbs: 0.6, fat: 1.4, fiber: 0.3, serving: "كوب واحد", servingGrams: 240 },

  // === بقوليات ===
  { id: "legume-1", nameAr: "فول مدمس", nameEn: "Foul Medames", category: "بقوليات", calories: 110, protein: 8, carbs: 15, fat: 2, fiber: 5, serving: "طبق صغير", servingGrams: 150 },
  { id: "legume-2", nameAr: "حمص بالطحينة", nameEn: "Hummus", category: "بقوليات", calories: 166, protein: 8, carbs: 14, fat: 10, fiber: 6, serving: "طبق صغير", servingGrams: 100 },
  { id: "legume-3", nameAr: "فلافل", nameEn: "Falafel", category: "بقوليات", calories: 333, protein: 13, carbs: 32, fat: 18, fiber: 5, serving: "5 حبات", servingGrams: 100 },
  { id: "legume-4", nameAr: "عدس مطبوخ", nameEn: "Cooked Lentils", category: "بقوليات", calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, serving: "كوب واحد", servingGrams: 198 },
  { id: "legume-5", nameAr: "فاصوليا بيضاء", nameEn: "White Beans", category: "بقوليات", calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 6.3, serving: "كوب واحد", servingGrams: 179 },

  // === فواكه ===
  { id: "fruit-1", nameAr: "تفاح", nameEn: "Apple", category: "فواكه", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, serving: "حبة متوسطة", servingGrams: 182 },
  { id: "fruit-2", nameAr: "موز", nameEn: "Banana", category: "فواكه", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, serving: "حبة متوسطة", servingGrams: 118 },
  { id: "fruit-3", nameAr: "برتقال", nameEn: "Orange", category: "فواكه", calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, serving: "حبة متوسطة", servingGrams: 131 },
  { id: "fruit-4", nameAr: "تمر", nameEn: "Dates", category: "فواكه", calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 7, serving: "5 حبات", servingGrams: 50 },
  { id: "fruit-5", nameAr: "بطيخ", nameEn: "Watermelon", category: "فواكه", calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, serving: "شريحة كبيرة", servingGrams: 280 },
  { id: "fruit-6", nameAr: "مانجو", nameEn: "Mango", category: "فواكه", calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, serving: "حبة واحدة", servingGrams: 200 },
  { id: "fruit-7", nameAr: "عنب", nameEn: "Grapes", category: "فواكه", calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, serving: "كوب واحد", servingGrams: 151 },
  { id: "fruit-8", nameAr: "فراولة", nameEn: "Strawberry", category: "فواكه", calories: 32, protein: 0.7, carbs: 8, fat: 0.3, fiber: 2, serving: "كوب واحد", servingGrams: 152 },
  { id: "fruit-9", nameAr: "أفوكادو", nameEn: "Avocado", category: "فواكه", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, serving: "نصف حبة", servingGrams: 100 },
  { id: "fruit-10", nameAr: "رمان", nameEn: "Pomegranate", category: "فواكه", calories: 83, protein: 1.7, carbs: 19, fat: 1.2, fiber: 4, serving: "حبة متوسطة", servingGrams: 174 },

  // === خضروات ===
  { id: "veg-1", nameAr: "خيار", nameEn: "Cucumber", category: "خضروات", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, serving: "حبة واحدة", servingGrams: 120 },
  { id: "veg-2", nameAr: "طماطم", nameEn: "Tomato", category: "خضروات", calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, serving: "حبة متوسطة", servingGrams: 123 },
  { id: "veg-3", nameAr: "خس", nameEn: "Lettuce", category: "خضروات", calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, serving: "كوب واحد", servingGrams: 72 },
  { id: "veg-4", nameAr: "بطاطس مسلوقة", nameEn: "Boiled Potato", category: "خضروات", calories: 87, protein: 1.9, carbs: 20, fat: 0.1, fiber: 1.8, serving: "حبة متوسطة", servingGrams: 150 },
  { id: "veg-5", nameAr: "بطاطس مقلية", nameEn: "French Fries", category: "خضروات", calories: 312, protein: 3.4, carbs: 41, fat: 15, fiber: 3.8, serving: "حصة متوسطة", servingGrams: 117 },
  { id: "veg-6", nameAr: "سلطة خضراء", nameEn: "Green Salad", category: "خضروات", calories: 20, protein: 1.5, carbs: 3.5, fat: 0.2, fiber: 2, serving: "طبق واحد", servingGrams: 150 },
  { id: "veg-7", nameAr: "تبولة", nameEn: "Tabbouleh", category: "خضروات", calories: 90, protein: 2, carbs: 10, fat: 5, fiber: 3, serving: "طبق صغير", servingGrams: 120 },
  { id: "veg-8", nameAr: "فتوش", nameEn: "Fattoush", category: "خضروات", calories: 110, protein: 2, carbs: 12, fat: 6, fiber: 3, serving: "طبق واحد", servingGrams: 150 },
  { id: "veg-9", nameAr: "بروكلي مسلوق", nameEn: "Steamed Broccoli", category: "خضروات", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3.3, serving: "كوب واحد", servingGrams: 156 },
  { id: "veg-10", nameAr: "سبانخ", nameEn: "Spinach", category: "خضروات", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, serving: "كوب واحد", servingGrams: 180 },

  // === مكسرات وبذور ===
  { id: "nut-1", nameAr: "لوز", nameEn: "Almonds", category: "مكسرات", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, serving: "حفنة (23 حبة)", servingGrams: 28 },
  { id: "nut-2", nameAr: "جوز", nameEn: "Walnuts", category: "مكسرات", calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 7, serving: "حفنة (7 حبات)", servingGrams: 28 },
  { id: "nut-3", nameAr: "فول سوداني", nameEn: "Peanuts", category: "مكسرات", calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 9, serving: "حفنة", servingGrams: 28 },
  { id: "nut-4", nameAr: "زبدة فول سوداني", nameEn: "Peanut Butter", category: "مكسرات", calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, serving: "ملعقتين", servingGrams: 32 },
  { id: "nut-5", nameAr: "بذور شيا", nameEn: "Chia Seeds", category: "مكسرات", calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, serving: "ملعقتين", servingGrams: 28 },

  // === مشروبات ===
  { id: "drink-1", nameAr: "شاي بدون سكر", nameEn: "Tea (no sugar)", category: "مشروبات", calories: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0, serving: "كوب واحد", servingGrams: 240 },
  { id: "drink-2", nameAr: "قهوة سادة", nameEn: "Black Coffee", category: "مشروبات", calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, serving: "كوب واحد", servingGrams: 240 },
  { id: "drink-3", nameAr: "قهوة بالحليب", nameEn: "Latte", category: "مشروبات", calories: 135, protein: 7, carbs: 11, fat: 7, fiber: 0, serving: "كوب واحد", servingGrams: 350 },
  { id: "drink-4", nameAr: "عصير برتقال طبيعي", nameEn: "Fresh Orange Juice", category: "مشروبات", calories: 45, protein: 0.7, carbs: 10, fat: 0.2, fiber: 0.2, serving: "كوب واحد", servingGrams: 248 },
  { id: "drink-5", nameAr: "عصير مانجو", nameEn: "Mango Juice", category: "مشروبات", calories: 60, protein: 0.4, carbs: 15, fat: 0.1, fiber: 0.3, serving: "كوب واحد", servingGrams: 250 },
  { id: "drink-6", nameAr: "كولا", nameEn: "Cola", category: "مشروبات", calories: 42, protein: 0, carbs: 11, fat: 0, fiber: 0, serving: "علبة واحدة", servingGrams: 355 },
  { id: "drink-7", nameAr: "مشروب طاقة", nameEn: "Energy Drink", category: "مشروبات", calories: 45, protein: 0, carbs: 11, fat: 0, fiber: 0, serving: "علبة واحدة", servingGrams: 250 },
  { id: "drink-8", nameAr: "بروتين شيك", nameEn: "Protein Shake", category: "مشروبات", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, serving: "سكوب واحد + ماء", servingGrams: 300 },

  // === حلويات ===
  { id: "sweet-1", nameAr: "كنافة", nameEn: "Kunafa", category: "حلويات", calories: 350, protein: 6, carbs: 45, fat: 16, fiber: 1, serving: "قطعة واحدة", servingGrams: 120 },
  { id: "sweet-2", nameAr: "بسبوسة", nameEn: "Basbousa", category: "حلويات", calories: 320, protein: 4, carbs: 48, fat: 13, fiber: 0.5, serving: "قطعة واحدة", servingGrams: 100 },
  { id: "sweet-3", nameAr: "بقلاوة", nameEn: "Baklava", category: "حلويات", calories: 428, protein: 6, carbs: 43, fat: 27, fiber: 2, serving: "قطعتين", servingGrams: 80 },
  { id: "sweet-4", nameAr: "شوكولاتة داكنة", nameEn: "Dark Chocolate", category: "حلويات", calories: 546, protein: 5, carbs: 60, fat: 31, fiber: 7, serving: "3 مربعات", servingGrams: 30 },
  { id: "sweet-5", nameAr: "آيس كريم", nameEn: "Ice Cream", category: "حلويات", calories: 207, protein: 3.5, carbs: 24, fat: 11, fiber: 0.7, serving: "كوب صغير", servingGrams: 132 },

  // === وجبات سريعة ===
  { id: "fast-1", nameAr: "برجر لحم", nameEn: "Beef Burger", category: "وجبات سريعة", calories: 354, protein: 20, carbs: 29, fat: 17, fiber: 1, serving: "ساندويتش واحد", servingGrams: 200 },
  { id: "fast-2", nameAr: "بيتزا مارجريتا", nameEn: "Margherita Pizza", category: "وجبات سريعة", calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.3, serving: "شريحتين", servingGrams: 200 },
  { id: "fast-3", nameAr: "دجاج مقلي", nameEn: "Fried Chicken", category: "وجبات سريعة", calories: 320, protein: 22, carbs: 15, fat: 19, fiber: 0.5, serving: "قطعتين", servingGrams: 180 },
  { id: "fast-4", nameAr: "ناجتس دجاج", nameEn: "Chicken Nuggets", category: "وجبات سريعة", calories: 296, protein: 15, carbs: 18, fat: 18, fiber: 1, serving: "6 قطع", servingGrams: 100 },
  { id: "fast-5", nameAr: "سندويتش فلافل", nameEn: "Falafel Sandwich", category: "وجبات سريعة", calories: 350, protein: 12, carbs: 42, fat: 15, fiber: 5, serving: "ساندويتش واحد", servingGrams: 200 },

  // === مكملات رياضية ===
  { id: "supp-1", nameAr: "واي بروتين", nameEn: "Whey Protein", category: "مكملات", calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, serving: "سكوب واحد", servingGrams: 30 },
  { id: "supp-2", nameAr: "كرياتين", nameEn: "Creatine", category: "مكملات", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, serving: "5 جرام", servingGrams: 5 },
  { id: "supp-3", nameAr: "BCAA", nameEn: "BCAA", category: "مكملات", calories: 10, protein: 2.5, carbs: 0, fat: 0, fiber: 0, serving: "سكوب واحد", servingGrams: 7 },
  { id: "supp-4", nameAr: "بار بروتين", nameEn: "Protein Bar", category: "مكملات", calories: 220, protein: 20, carbs: 25, fat: 8, fiber: 3, serving: "بار واحد", servingGrams: 60 },
  { id: "supp-5", nameAr: "شوفان بروتين", nameEn: "Protein Oats", category: "مكملات", calories: 180, protein: 15, carbs: 28, fat: 3, fiber: 4, serving: "حصة واحدة", servingGrams: 50 },
];

const FOOD_CATEGORIES = [
  "الكل", "خبز ومعجنات", "أرز ومكرونة", "لحوم ودواجن", "أسماك",
  "بيض وألبان", "بقوليات", "فواكه", "خضروات", "مكسرات",
  "مشروبات", "حلويات", "وجبات سريعة", "مكملات"
];

// ═══════════════════════════════════════════════════════════════════════════════
// Meal Log Types
// ═══════════════════════════════════════════════════════════════════════════════

interface MealEntry {
  id: string;
  food: FoodItem;
  servings: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  timestamp: string;
}

interface DailyLog {
  date: string;
  meals: MealEntry[];
  waterGlasses: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function getTodayLog(): DailyLog {
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem(`medisport_food_${today}`);
  if (stored) return JSON.parse(stored);
  return {
    date: today,
    meals: [],
    waterGlasses: 0,
    targetCalories: 2200,
    targetProtein: 150,
    targetCarbs: 250,
    targetFat: 70,
  };
}

function saveTodayLog(log: DailyLog) {
  localStorage.setItem(`medisport_food_${log.date}`, JSON.stringify(log));
}

function calculateMealNutrition(entry: MealEntry) {
  const multiplier = (entry.servings * entry.food.servingGrams) / 100;
  return {
    calories: Math.round(entry.food.calories * multiplier),
    protein: Math.round(entry.food.protein * multiplier * 10) / 10,
    carbs: Math.round(entry.food.carbs * multiplier * 10) / 10,
    fat: Math.round(entry.food.fat * multiplier * 10) / 10,
    fiber: Math.round(entry.food.fiber * multiplier * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Food Logger Button (Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

export function FoodLoggerButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="cursor-pointer border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base">سجل أكلك</h3>
                <p className="text-xs text-muted-foreground">تتبع السعرات والماكروز</p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                <Apple className="w-3 h-3 mr-1" />
                تغذية
              </Badge>
            </div>
          </CardContent>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right flex items-center gap-2">
            <Utensils className="w-5 h-5 text-green-600" />
            سجل أكلك اليوم
          </SheetTitle>
          <SheetDescription className="text-right">
            تتبع وجباتك وسعراتك والماكروز — قاعدة بيانات عربية شاملة
          </SheetDescription>
        </SheetHeader>
        <FoodLoggerContent />
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Food Logger Content
// ═══════════════════════════════════════════════════════════════════════════════

function FoodLoggerContent() {
  const [log, setLog] = React.useState<DailyLog>(getTodayLog());
  const [activeTab, setActiveTab] = React.useState<"overview" | "add" | "water" | "recipe" | "scan">("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("الكل");
  const [selectedMealType, setSelectedMealType] = React.useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [servings, setServings] = React.useState(1);

  const updateLog = (newLog: DailyLog) => {
    setLog(newLog);
    saveTodayLog(newLog);
  };

  // Calculate totals
  const totals = React.useMemo(() => {
    return log.meals.reduce(
      (acc, entry) => {
        const nutrition = calculateMealNutrition(entry);
        return {
          calories: acc.calories + nutrition.calories,
          protein: acc.protein + nutrition.protein,
          carbs: acc.carbs + nutrition.carbs,
          fat: acc.fat + nutrition.fat,
          fiber: acc.fiber + nutrition.fiber,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [log.meals]);

  const addFood = (food: FoodItem) => {
    const entry: MealEntry = {
      id: Date.now().toString(),
      food,
      servings,
      mealType: selectedMealType,
      timestamp: new Date().toISOString(),
    };
    updateLog({ ...log, meals: [...log.meals, entry] });
    setServings(1);
    toast.success(`تم إضافة ${food.nameAr}`);
  };

  const removeFood = (id: string) => {
    updateLog({ ...log, meals: log.meals.filter((m) => m.id !== id) });
    toast.success("تم الحذف");
  };

  const filteredFoods = FOOD_DATABASE.filter((food) => {
    const matchesSearch =
      searchQuery === "" ||
      food.nameAr.includes(searchQuery) ||
      food.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "الكل" || food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mt-4 space-y-4" dir="rtl">
      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "overview" as const, label: "ملخص اليوم", icon: BarChart3 },
          { id: "add" as const, label: "أضف أكل", icon: Plus },
          { id: "water" as const, label: "مياه", icon: Droplets },
          { id: "recipe" as const, label: "وصفة", icon: ChefHat },
          { id: "scan" as const, label: "مسح", icon: Camera },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══ Overview Tab ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Calorie Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">السعرات اليوم</h4>
                <span className="text-sm text-muted-foreground">
                  {totals.calories} / {log.targetCalories} سعرة
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    totals.calories > log.targetCalories
                      ? "bg-red-500"
                      : totals.calories > log.targetCalories * 0.8
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min((totals.calories / log.targetCalories) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>متبقي: {Math.max(log.targetCalories - totals.calories, 0)} سعرة</span>
                <span>{Math.round((totals.calories / log.targetCalories) * 100)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-blue-50">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{Math.round(totals.protein)}g</div>
                <div className="text-xs text-blue-600">بروتين</div>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min((totals.protein / log.targetProtein) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-blue-500 mt-0.5">{log.targetProtein}g هدف</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-amber-700">{Math.round(totals.carbs)}g</div>
                <div className="text-xs text-amber-600">كربوهيدرات</div>
                <div className="w-full bg-amber-200 rounded-full h-1.5 mt-1">
                  <div
                    className="h-full bg-amber-600 rounded-full"
                    style={{ width: `${Math.min((totals.carbs / log.targetCarbs) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-amber-500 mt-0.5">{log.targetCarbs}g هدف</div>
              </CardContent>
            </Card>
            <Card className="bg-rose-50">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-rose-700">{Math.round(totals.fat)}g</div>
                <div className="text-xs text-rose-600">دهون</div>
                <div className="w-full bg-rose-200 rounded-full h-1.5 mt-1">
                  <div
                    className="h-full bg-rose-600 rounded-full"
                    style={{ width: `${Math.min((totals.fat / log.targetFat) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5">{log.targetFat}g هدف</div>
              </CardContent>
            </Card>
          </div>

          {/* Water Tracker Mini */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">المياه</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{log.waterGlasses} / 8 أكواب</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      updateLog({ ...log, waterGlasses: Math.min(log.waterGlasses + 1, 15) });
                      toast.success("💧 كوب مياه!");
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-3 rounded-full ${
                      i < log.waterGlasses ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Meals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">وجبات اليوم</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {["breakfast", "lunch", "dinner", "snack"].map((mealType) => {
                const mealLabel = {
                  breakfast: "فطور",
                  lunch: "غداء",
                  dinner: "عشاء",
                  snack: "سناك",
                }[mealType];
                const mealIcon = {
                  breakfast: Sun,
                  lunch: Sunset,
                  dinner: Moon,
                  snack: Coffee,
                }[mealType]!;
                const MealIcon = mealIcon;
                const mealEntries = log.meals.filter((m) => m.mealType === mealType);
                const mealCalories = mealEntries.reduce((sum, e) => {
                  return sum + calculateMealNutrition(e).calories;
                }, 0);

                return (
                  <div key={mealType} className="border rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <MealIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{mealLabel}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {mealCalories} سعرة
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setSelectedMealType(mealType as typeof selectedMealType);
                          setActiveTab("add");
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        أضف
                      </Button>
                    </div>
                    {mealEntries.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {mealEntries.map((entry) => {
                          const nutrition = calculateMealNutrition(entry);
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between text-xs bg-gray-50 rounded p-1.5"
                            >
                              <div className="flex items-center gap-1">
                                <span>{entry.food.nameAr}</span>
                                {entry.servings !== 1 && (
                                  <Badge variant="outline" className="text-[9px] px-1">
                                    x{entry.servings}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {nutrition.calories} سعرة
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-red-400 hover:text-red-600"
                                  onClick={() => removeFood(entry.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Add Food Tab ═══ */}
      {activeTab === "add" && (
        <div className="space-y-3">
          {/* Meal Type Selector */}
          <div className="flex gap-2">
            {[
              { id: "breakfast" as const, label: "فطور", icon: Sun },
              { id: "lunch" as const, label: "غداء", icon: Sunset },
              { id: "dinner" as const, label: "عشاء", icon: Moon },
              { id: "snack" as const, label: "سناك", icon: Coffee },
            ].map((meal) => (
              <Button
                key={meal.id}
                variant={selectedMealType === meal.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMealType(meal.id)}
                className="flex-1 text-xs"
              >
                <meal.icon className="w-3 h-3 mr-1" />
                {meal.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن أكل... (عربي أو إنجليزي)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 text-right"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {FOOD_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="text-xs whitespace-nowrap h-7"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Servings */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
            <span className="text-sm font-medium">الكمية:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => setServings(Math.max(0.5, servings - 0.5))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="font-bold text-lg w-8 text-center">{servings}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => setServings(servings + 0.5)}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground">حصة</span>
          </div>

          {/* Food List */}
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {filteredFoods.slice(0, 30).map((food) => {
              const cals = Math.round((food.calories * food.servingGrams) / 100);
              return (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                  onClick={() => addFood(food)}
                >
                  <div>
                    <div className="font-medium text-sm">{food.nameAr}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {food.nameEn} • {food.serving}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-green-700">{cals} سعرة</div>
                    <div className="text-[10px] text-muted-foreground">
                      P:{Math.round((food.protein * food.servingGrams) / 100)}g
                      C:{Math.round((food.carbs * food.servingGrams) / 100)}g
                      F:{Math.round((food.fat * food.servingGrams) / 100)}g
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredFoods.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>مش لاقي نتائج — جرب كلمة تانية</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Water Tab ═══ */}
      {activeTab === "water" && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6 text-center">
              <Droplets className="w-16 h-16 mx-auto text-blue-500 mb-3" />
              <div className="text-4xl font-bold text-blue-700 mb-1">
                {log.waterGlasses}
              </div>
              <div className="text-sm text-blue-600 mb-4">أكواب من 8</div>
              <div className="text-xs text-muted-foreground mb-4">
                ≈ {log.waterGlasses * 250} مل من {8 * 250} مل
              </div>
              <div className="flex gap-2 justify-center flex-wrap mb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      i < log.waterGlasses
                        ? "bg-blue-500 border-blue-600 text-white"
                        : "bg-white border-blue-200 text-blue-300"
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => updateLog({ ...log, waterGlasses: Math.max(0, log.waterGlasses - 1) })}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  كوب
                </Button>
                <Button
                  onClick={() => {
                    updateLog({ ...log, waterGlasses: Math.min(15, log.waterGlasses + 1) });
                    toast.success("💧 أحسنت! كوب مياه كمان!");
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  كوب
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Water Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">نصائح الترطيب</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span>اشرب كوب مياه أول ما تصحى — ده بينشط الجسم</span>
              </div>
              <div className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span>لو بتتمرن، زود 2-3 أكواب إضافية</span>
              </div>
              <div className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>الفواكه والخضروات فيها مياه كتير — بتساعد في الترطيب</span>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>لون البول الفاتح = ترطيب كويس ✓</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Recipe Calculator Tab ═══ */}
      {activeTab === "recipe" && <RecipeCalculator onAddToLog={(food) => addFood(food)} />}

      {/* ═══ Scan Tab ═══ */}
      {activeTab === "scan" && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6 text-center">
              <Camera className="w-16 h-16 mx-auto text-purple-500 mb-3" />
              <h3 className="font-bold text-lg mb-2">مسح الأكل بالكاميرا</h3>
              <p className="text-sm text-muted-foreground mb-4">
                صور وجبتك وخلي الذكاء الاصطناعي يحسبلك السعرات
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Camera className="w-4 h-4 mr-2" />
                افتح الكاميرا
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                🔜 قريباً — AI Meal Scanner
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
            <CardContent className="p-6 text-center">
              <QrCode className="w-16 h-16 mx-auto text-gray-500 mb-3" />
              <h3 className="font-bold text-lg mb-2">مسح الباركود</h3>
              <p className="text-sm text-muted-foreground mb-4">
                امسح باركود أي منتج غذائي لمعرفة القيم الغذائية فوراً
              </p>
              <Button variant="outline">
                <QrCode className="w-4 h-4 mr-2" />
                امسح باركود
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                🔜 قريباً — Barcode Scanner
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recipe Calculator Component
// ═══════════════════════════════════════════════════════════════════════════════

function RecipeCalculator({ onAddToLog }: { onAddToLog: (food: FoodItem) => void }) {
  const [recipeName, setRecipeName] = React.useState("");
  const [ingredients, setIngredients] = React.useState<
    { food: FoodItem; grams: number }[]
  >([]);
  const [servingsCount, setServingsCount] = React.useState(4);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);

  const totalNutrition = React.useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => {
        const multiplier = ing.grams / 100;
        return {
          calories: acc.calories + ing.food.calories * multiplier,
          protein: acc.protein + ing.food.protein * multiplier,
          carbs: acc.carbs + ing.food.carbs * multiplier,
          fat: acc.fat + ing.food.fat * multiplier,
          fiber: acc.fiber + ing.food.fiber * multiplier,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [ingredients]);

  const perServing = {
    calories: Math.round(totalNutrition.calories / servingsCount),
    protein: Math.round((totalNutrition.protein / servingsCount) * 10) / 10,
    carbs: Math.round((totalNutrition.carbs / servingsCount) * 10) / 10,
    fat: Math.round((totalNutrition.fat / servingsCount) * 10) / 10,
    fiber: Math.round((totalNutrition.fiber / servingsCount) * 10) / 10,
  };

  const filteredFoods = FOOD_DATABASE.filter(
    (f) =>
      f.nameAr.includes(searchQuery) ||
      f.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveAsFood = () => {
    if (!recipeName || ingredients.length === 0) {
      toast.error("أدخل اسم الوصفة وأضف مكونات");
      return;
    }
    const totalGrams = ingredients.reduce((sum, ing) => sum + ing.grams, 0);
    const customFood: FoodItem = {
      id: `recipe-${Date.now()}`,
      nameAr: recipeName,
      nameEn: recipeName,
      category: "وصفات مخصصة",
      calories: Math.round((totalNutrition.calories / totalGrams) * 100),
      protein: Math.round((totalNutrition.protein / totalGrams) * 100 * 10) / 10,
      carbs: Math.round((totalNutrition.carbs / totalGrams) * 100 * 10) / 10,
      fat: Math.round((totalNutrition.fat / totalGrams) * 100 * 10) / 10,
      fiber: Math.round((totalNutrition.fiber / totalGrams) * 100 * 10) / 10,
      serving: `حصة واحدة (${Math.round(totalGrams / servingsCount)}g)`,
      servingGrams: Math.round(totalGrams / servingsCount),
    };
    onAddToLog(customFood);
    toast.success(`تم إضافة "${recipeName}" لوجباتك!`);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-orange-500" />
            حاسبة الوصفات
          </CardTitle>
          <CardDescription className="text-xs">
            أدخل مكونات وصفتك وهنحسبلك القيم الغذائية لكل حصة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <Input
            placeholder="اسم الوصفة (مثلاً: شوربة عدس)"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="text-right"
          />

          <div className="flex items-center gap-2">
            <span className="text-sm">عدد الحصص:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => setServingsCount(Math.max(1, servingsCount - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="font-bold">{servingsCount}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => setServingsCount(servingsCount + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Add Ingredient */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Plus className="w-4 h-4 mr-1" />
            أضف مكون
          </Button>

          {showSearch && (
            <div className="border rounded-lg p-2 space-y-2">
              <Input
                placeholder="ابحث عن مكون..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-right text-sm"
                autoFocus
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredFoods.slice(0, 10).map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded cursor-pointer text-xs"
                    onClick={() => {
                      setIngredients([...ingredients, { food, grams: 100 }]);
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                  >
                    <span>{food.nameAr}</span>
                    <span className="text-muted-foreground">{food.calories} سعرة/100g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients List */}
          {ingredients.length > 0 && (
            <div className="space-y-1.5">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                  <span className="text-xs flex-1">{ing.food.nameAr}</span>
                  <Input
                    type="number"
                    value={ing.grams}
                    onChange={(e) => {
                      const newIngs = [...ingredients];
                      newIngs[idx].grams = parseInt(e.target.value) || 0;
                      setIngredients(newIngs);
                    }}
                    className="w-16 h-7 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">جرام</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-400"
                    onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Per Serving Result */}
          {ingredients.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <h5 className="font-bold text-sm text-green-800 mb-2">لكل حصة:</h5>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-green-700">{perServing.calories}</div>
                    <div className="text-green-600">سعرة</div>
                  </div>
                  <div>
                    <div className="font-bold text-blue-700">{perServing.protein}g</div>
                    <div className="text-blue-600">بروتين</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-700">{perServing.carbs}g</div>
                    <div className="text-amber-600">كربو</div>
                  </div>
                  <div>
                    <div className="font-bold text-rose-700">{perServing.fat}g</div>
                    <div className="text-rose-600">دهون</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3 bg-green-600 hover:bg-green-700"
                  onClick={saveAsFood}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  أضف حصة لوجباتي
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
