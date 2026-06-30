import heroImage from "@/assets/images/fotografias_Medio_Ambiente/IMG_20241228_140951_994.jpg";
import environmentImageA from "@/assets/images/fotografias_Medio_Ambiente/IMG_20240926_142306_063.jpg";
import environmentImageB from "@/assets/images/fotografias_Medio_Ambiente/IMG_20260203_100156_744.jpg";
import environmentImageC from "@/assets/images/fotografias_Medio_Ambiente/IMG_20240926_142256_900.jpg";
import { ResponsibleTopicPage } from "@/corporate-site/components/ResponsibleTopicPage";
import { environmentPrograms } from "@/corporate-site/content/responsibleMining";

export function EnvironmentPage() {
  return (
    <ResponsibleTopicPage
      eyebrow="Environmental management"
      title="Environmental Management"
      description="Empresa Minera Marte operates with a commitment to prevent, control and minimize the environmental impacts associated with mining activities."
      heroImage={heroImage}
      gallery={[environmentImageA, environmentImageB, environmentImageC]}
      accent="environment"
      leadTitle="Prevention, Control And Continuous Improvement"
      leadDescription="Our environmental management is based on permanent monitoring, regulatory compliance and continuous improvement, with special attention to water, air, soil and waste."
      programs={environmentPrograms}
    />
  );
}
