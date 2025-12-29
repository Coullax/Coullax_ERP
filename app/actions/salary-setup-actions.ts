"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// =====================================================
// Types
// =====================================================

export type SalaryCategory = {
    id: string;
    name: string;
    description: string | null;
    category_type: "deduction" | "addition" | "allowance";
    created_at: string;
    updated_at: string;
};

export type ApitRange = {
    id: string;
    name: string;
    min_amount: number;
    max_amount: number | null;
    percentage: number;
    created_at: string;
    updated_at: string;
};

export type SalaryCategoryRule = {
    id: string;
    category_id: string;
    calculation_type: "percentage" | "fixed";
    value: number;
    description: string | null;
    created_at: string;
    updated_at: string;
    category?: SalaryCategory;
};

// =====================================================
// Salary Categories Actions
// =====================================================

export async function createSalaryCategory(data: {
    name: string;
    description?: string;
    category_type: "deduction" | "addition" | "allowance";
}) {
    try {
        const supabase = await createClient();

        const { data: category, error } = await supabase
            .from("salary_categories")
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: category };
    } catch (error: any) {
        console.error("Error creating salary category:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalaryCategory(
    id: string,
    data: {
        name?: string;
        description?: string;
        category_type?: "deduction" | "addition" | "allowance";
    }
) {
    try {
        const supabase = await createClient();

        const { data: category, error } = await supabase
            .from("salary_categories")
            .update(data)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: category };
    } catch (error: any) {
        console.error("Error updating salary category:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSalaryCategory(id: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("salary_categories")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting salary category:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllSalaryCategories() {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("salary_categories")
            .select("*")
            .order("category_type", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;

        return { success: true, data: data as SalaryCategory[] };
    } catch (error: any) {
        console.error("Error fetching salary categories:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// =====================================================
// APIT Ranges Actions
// =====================================================

export async function createApitRange(data: {
    name: string;
    min_amount: number;
    max_amount?: number | null;
    percentage: number;
}) {
    try {
        const supabase = await createClient();

        const { data: range, error } = await supabase
            .from("apit_ranges")
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: range };
    } catch (error: any) {
        console.error("Error creating APIT range:", error);
        return { success: false, error: error.message };
    }
}

export async function updateApitRange(
    id: string,
    data: {
        name?: string;
        min_amount?: number;
        max_amount?: number | null;
        percentage?: number;
    }
) {
    try {
        const supabase = await createClient();

        const { data: range, error } = await supabase
            .from("apit_ranges")
            .update(data)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: range };
    } catch (error: any) {
        console.error("Error updating APIT range:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteApitRange(id: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("apit_ranges")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting APIT range:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllApitRanges() {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("apit_ranges")
            .select("*")
            .order("min_amount", { ascending: true });

        if (error) throw error;

        return { success: true, data: data as ApitRange[] };
    } catch (error: any) {
        console.error("Error fetching APIT ranges:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// =====================================================
// Salary Category Rules Actions
// =====================================================

export async function createCategoryRule(data: {
    category_id: string;
    calculation_type: "percentage" | "fixed";
    value: number;
    description?: string;
}) {
    try {
        const supabase = await createClient();

        const { data: rule, error } = await supabase
            .from("salary_category_rules")
            .insert([data])
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: rule };
    } catch (error: any) {
        console.error("Error creating category rule:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCategoryRule(
    id: string,
    data: {
        category_id?: string;
        calculation_type?: "percentage" | "fixed";
        value?: number;
        description?: string;
    }
) {
    try {
        const supabase = await createClient();

        const { data: rule, error } = await supabase
            .from("salary_category_rules")
            .update(data)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true, data: rule };
    } catch (error: any) {
        console.error("Error updating category rule:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCategoryRule(id: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("salary_category_rules")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/salary/setup");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting category rule:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllCategoryRules() {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("salary_category_rules")
            .select(`
        *,
        category:salary_categories!category_id(*)
      `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return { success: true, data: data as SalaryCategoryRule[] };
    } catch (error: any) {
        console.error("Error fetching category rules:", error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getRulesByCategory(categoryId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("salary_category_rules")
            .select(`
        *,
        category:salary_categories!category_id(*)
      `)
            .eq("category_id", categoryId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return { success: true, data: data as SalaryCategoryRule[] };
    } catch (error: any) {
        console.error("Error fetching rules by category:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// =====================================================
// Helper Actions
// =====================================================

export async function getSalarySetupData() {
    try {
        const [categoriesResult, rangesResult, rulesResult] = await Promise.all([
            getAllSalaryCategories(),
            getAllApitRanges(),
            getAllCategoryRules(),
        ]);

        return {
            success: true,
            data: {
                categories: categoriesResult.data || [],
                ranges: rangesResult.data || [],
                rules: rulesResult.data || [],
            },
        };
    } catch (error: any) {
        console.error("Error fetching salary setup data:", error);
        return {
            success: false,
            error: error.message,
            data: { categories: [], ranges: [], rules: [] },
        };
    }
}
