import { notFound } from "next/navigation";
import { MemoryEpisodes } from "@/components/memory-episodes";
import { familyPageContext } from "@/lib/memories/page-context";
export default async function Page({params}:{params:Promise<{familyId:string}>}) {
  const {familyId}=await params;
  const {view}=await familyPageContext(familyId);
  if(view.role==="READER")notFound();
  return <MemoryEpisodes familyId={familyId}/>;
}
