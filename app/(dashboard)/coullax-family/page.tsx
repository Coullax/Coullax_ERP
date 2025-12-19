import { getCoullaxFamily } from "@/app/actions/family-actions";
import { FamilyClient } from "./family-client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CoullaxFamilyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const familyMembers = await getCoullaxFamily();

    return (
        <div className="p-6">
            <FamilyClient members={familyMembers} />
        </div>
    );
}
