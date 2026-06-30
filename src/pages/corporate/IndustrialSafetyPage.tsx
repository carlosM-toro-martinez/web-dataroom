import safetyImageA from "@/assets/images/fotos_seguridad/F10 Control de gases en interior mina.jpg";
import safetyImageB from "@/assets/images/fotos_seguridad/F4_Capacitacion primeros auxilios.jpg";
import safetyImageC from "@/assets/images/fotos_seguridad/F5_Dotación de ropa de trabajo.jpg";
import safetyImageD from "@/assets/images/fotos_seguridad/F8_ Capacitaciones semanales.jpg";
import { ResponsibleTopicPage } from "@/corporate-site/components/ResponsibleTopicPage";
import { safetyPrograms } from "@/corporate-site/content/responsibleMining";

export function IndustrialSafetyPage() {
  return (
    <ResponsibleTopicPage
      eyebrow="Health and safety"
      title="Industrial Safety"
      description="The safety and health of our workers, contractors and visitors are a permanent priority for Empresa Minera Marte."
      heroImage={safetyImageD}
      gallery={[safetyImageA, safetyImageB, safetyImageC]}
      accent="safety"
      leadTitle="Preventive Culture In Every Activity"
      leadDescription="We continuously identify hazards, evaluate risks and implement controls that allow activities to be carried out under safe and healthy conditions."
      programs={safetyPrograms}
    />
  );
}
