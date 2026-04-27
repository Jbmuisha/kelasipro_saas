"use client";

import { Document as PDFDocument, Page as PDFPage, Text as PDFText, View as PDFView, StyleSheet as PDFStyleSheet } from '@react-pdf/renderer';

// Type assertion to avoid JSX type errors with @react-pdf/renderer
const Document: any = PDFDocument;
const Page: any = PDFPage;
const Text: any = PDFText;
const View: any = PDFView;
const StyleSheet: any = PDFStyleSheet;

// Define types
export interface ContractData {
  id: number;
  contract_number: string;
  start_date: string;
  end_date: string;
  terms?: string;
  status: string;
  signed_by_school: boolean;
  signed_by_platform: boolean;
  school_signature_date?: string;
  platform_signature_date?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolData {
  id: number;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  school_type?: string;
}

export interface SubscriptionData {
  id: number;
  plan_type: string;
  amount: number;
  start_date: string;
  end_date: string;
}

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Times-Roman',
    lineHeight: 1.6,
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    borderBottom: '2pt solid #000',
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  documentNumber: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textDecoration: 'underline',
  },
  articleTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  signatureSection: {
    marginTop: 60,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
    borderTop: '1pt solid #000',
    paddingTop: 10,
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  signatureDate: {
    fontSize: 9,
    color: '#666',
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
    borderTop: '1pt solid #eee',
    paddingTop: 10,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#000',
  },
  amount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a365d',
    backgroundColor: '#f0f4f8',
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 5,
  },
});

interface ContractPDFProps {
  contract: ContractData;
  school: SchoolData;
  subscription: SubscriptionData;
}

export const ContractDocument = ({ contract, school, subscription }: ContractPDFProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const currentDate = formatDate(new Date().toISOString());

  // Determine school type checkbox
  const schoolTypeMap: { [key: string]: string } = {
    'maternelle': 'Maternelle',
    'primaire': 'Primaire',
    'secondaire': 'Secondaire',
    'universitaire': 'Universitaire',
    'mixed': 'Mixte',
  };

  const schoolTypeLabel = schoolTypeMap[school.school_type?.toLowerCase() || ''] || school.school_type || 'Autre';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CONTRAT D'UTILISATION</Text>
          <Text style={styles.subtitle}>DU SYSTÈME DE GESTION SCOLAIRE</Text>
          <Text style={styles.subtitle}>KELASI_PRO</Text>
        </View>

        {/* Document Number */}
        <View style={styles.documentNumber}>
          <Text>N° {contract.contract_number}</Text>
          <Text>Date: {currentDate}</Text>
        </View>

        {/* Article 1 - Identification des Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 1 — IDENTIFICATION DES PARTIES</Text>
          
          <Text style={styles.articleTitle}>1.1 Le Prestataire</Text>
          <Text style={styles.paragraph}>
            Nom de la société : KELASI_PRO
          </Text>
          <Text style={styles.paragraph}>
            Objet : Éditeur et fournisseur du système de gestion scolaire numérique Kelasi_Pro
          </Text>
          <Text style={styles.paragraph}>
            Représentant légal : ___________________________________
          </Text>
          <Text style={styles.paragraph}>
            Adresse : ___________________________________
          </Text>
          <Text style={styles.paragraph}>
            Email de contact : ___________________________________
          </Text>
        </View>

        {/* Article 1.2 - L'Établissement Scolaire */}
        <View style={styles.section}>
          <Text style={styles.articleTitle}>1.2 L'Établissement Scolaire (ci-après « le Client »)</Text>
          <Text style={styles.paragraph}>
            Nom de l'établissement : <Text style={styles.highlight}>{school.name}</Text>
          </Text>
          <Text style={styles.paragraph}>
            Type d'établissement : ☐ {schoolTypeLabel}
          </Text>
          <Text style={styles.paragraph}>
            Pays / Ville : ___________________________________
          </Text>
          <Text style={styles.paragraph}>
            Directeur / Représentant légal : ___________________________________
          </Text>
          <Text style={styles.paragraph}>
            Email officiel : {school.email || '________________'}
          </Text>
          <Text style={styles.paragraph}>
            Téléphone : {school.phone || '________________'}
          </Text>
        </View>

        {/* Article 2 - Objet du Contrat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 2 — OBJET DU CONTRAT</Text>
          <Text style={styles.paragraph}>
            Le présent contrat a pour objet de définir les conditions et modalités d'accès et d'utilisation
            de la plateforme numérique Kelasi_Pro, un système complet de gestion scolaire développé
            et maintenu par le Prestataire. Ce contrat encadre notamment :
          </Text>
          <Text style={styles.paragraph}>• L'accès aux fonctionnalités du système Kelasi_Pro ;</Text>
          <Text style={styles.paragraph}>• Les droits et obligations de chaque partie ;</Text>
          <Text style={styles.paragraph}>• Les conditions de support technique et de maintenance ;</Text>
          <Text style={styles.paragraph}>
            • Les modalités relatives au paiement et à la durée d'abonnement, qui seront définies
            séparément via la plateforme lors de l'activation du compte.
          </Text>
        </View>

        {/* Article 3 - Fonctionnalités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 3 — FONCTIONNALITÉS DU SYSTÈME KELASI_PRO</Text>
          <Text style={styles.paragraph}>
            Le système Kelasi_Pro met à la disposition du Client les fonctionnalités suivantes, sans
            limitation selon le plan souscrit :
          </Text>
          
          <Text style={styles.articleTitle}>3.1 Gestion Administrative</Text>
          <Text style={styles.paragraph}>• Inscription et gestion du dossier des élèves ;</Text>
          <Text style={styles.paragraph}>• Gestion du corps enseignant et du personnel administratif ;</Text>
          <Text style={styles.paragraph}>• Planification des emplois du temps et des classes ;</Text>
          <Text style={styles.paragraph}>• Suivi des présences et des absences.</Text>

          <Text style={styles.articleTitle}>3.2 Gestion Académique</Text>
          <Text style={styles.paragraph}>• Saisie et consultation des notes et bulletins ;</Text>
          <Text style={styles.paragraph}>• Génération automatique des rapports académiques ;</Text>
          <Text style={styles.paragraph}>• Suivi des performances individuelles et collectives des élèves.</Text>

          <Text style={styles.articleTitle}>3.3 Communication École-Famille</Text>
          <Text style={styles.paragraph}>• Messagerie interne entre enseignants, parents et administration ;</Text>
          <Text style={styles.paragraph}>• Envoi de notifications et de circulaires ;</Text>
          <Text style={styles.paragraph}>• Portail parents pour le suivi de la scolarité en temps réel.</Text>

          <Text style={styles.articleTitle}>3.4 Gestion Financière</Text>
          <Text style={styles.paragraph}>• Suivi des frais scolaires et des paiements des élèves ;</Text>
          <Text style={styles.paragraph}>• Édition de reçus et de factures ;</Text>
          <Text style={styles.paragraph}>• Tableau de bord financier de l'établissement.</Text>
        </View>

        {/* Article 4 - Abonnement et Conditions de Paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 4 — ABONNEMENT ET CONDITIONS DE PAIEMENT</Text>
          <Text style={styles.paragraph}>
            Les modalités précises de l'abonnement (montant, fréquence de facturation, mode de
            paiement, éventuelles remises) ainsi que la durée du contrat seront communiquées et
            convenues directement au sein de la plateforme Kelasi_Pro lors de l'activation du compte de
            l'établissement. Le Client reconnaît et accepte que :
          </Text>
          <Text style={styles.paragraph}>1. Les informations tarifaires sont susceptibles d'évoluer selon les plans proposés par Kelasi_Pro ;</Text>
          <Text style={styles.paragraph}>2. Tout abonnement activé est soumis aux conditions de paiement acceptées lors de l'inscription sur la plateforme ;</Text>
          <Text style={styles.paragraph}>3. En cas de non-paiement, le Prestataire se réserve le droit de suspendre l'accès au service après notification préalable.</Text>
          
          <View style={styles.amount}>
            <Text style={styles.highlight}>MONTANT MENSUEL : {formatCurrency(subscription.amount)}</Text>
          </View>
        </View>

        {/* Article 5 - Obligations des Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 5 — OBLIGATIONS DES PARTIES</Text>
          
          <Text style={styles.articleTitle}>5.1 Obligations du Prestataire (Kelasi_Pro)</Text>
          <Text style={styles.paragraph}>• Mettre à disposition la plateforme Kelasi_Pro de manière continue avec un taux de disponibilité cible de 99% ;</Text>
          <Text style={styles.paragraph}>• Assurer la maintenance corrective et évolutive du système ;</Text>
          <Text style={styles.paragraph}>• Garantir la sécurité et la confidentialité des données saisies dans le système ;</Text>
          <Text style={styles.paragraph}>• Fournir un support technique aux utilisateurs du Client.</Text>

          <Text style={styles.articleTitle}>5.2 Obligations du Client (Établissement Scolaire)</Text>
          <Text style={styles.paragraph}>• Utiliser le système Kelasi_Pro conformément à sa destination et aux présentes conditions ;</Text>
          <Text style={styles.paragraph}>• S'assurer que les données saisies sont exactes et conformes à la réglementation en vigueur ;</Text>
          <Text style={styles.paragraph}>• Ne pas partager les accès avec des tiers non autorisés ;</Text>
          <Text style={styles.paragraph}>• Informer le Prestataire de tout dysfonctionnement constaté dans les meilleurs délais.</Text>
        </View>

        {/* Article 6 - Protection des Données */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 6 — PROTECTION DES DONNÉES PERSONNELLES</Text>
          <Text style={styles.paragraph}>
            Le Client reconnaît que les données saisies dans Kelasi_Pro, notamment celles relatives
            aux élèves et aux personnels, constituent des données à caractère personnel. À ce titre :
          </Text>
          <Text style={styles.paragraph}>• Kelasi_Pro agit en qualité de sous-traitant des données au sens de la réglementation applicable ;</Text>
          <Text style={styles.paragraph}>• Le Client demeure responsable du traitement de ces données vis-à-vis des personnes concernées ;</Text>
          <Text style={styles.paragraph}>• Kelasi_Pro s'engage à ne pas utiliser ces données à des fins autres que la fourniture du service contractualisé ;</Text>
          <Text style={styles.paragraph}>• Les données sont hébergées de manière sécurisée et ne sont pas revendues à des tiers.</Text>
        </View>

        {/* Article 7 - Propriété Intellectuelle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 7 — PROPRIÉTÉ INTELLECTUELLE</Text>
          <Text style={styles.paragraph}>
            Le système Kelasi_Pro, y compris son code source, ses algorithmes, son interface et sa
            documentation, est la propriété exclusive de Kelasi_Pro. Le présent contrat confère au
            Client un droit d'utilisation non exclusif et non transférable du système, uniquement pour ses
            besoins propres. Toute reproduction, modification, diffusion ou exploitation du système sans autorisation
            écrite préalable de Kelasi_Pro est strictement interdite.
          </Text>
        </View>

        {/* Article 8 - Confidentialité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 8 — CONFIDENTIALITÉ</Text>
          <Text style={styles.paragraph}>
            Chaque partie s'engage à traiter comme strictement confidentiel l'ensemble des informations
            obtenues dans le cadre de l'exécution du présent contrat, et à ne pas les divulguer à des
            tiers sans l'accord écrit préalable de l'autre partie. Cette obligation de confidentialité survivra
            à la résiliation du présent contrat pour une durée de cinq (5) ans.
          </Text>
        </View>

        {/* Article 9 - Résiliation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 9 — RÉSILIATION ET FIN DE CONTRAT</Text>
          <Text style={styles.paragraph}>
            Chaque partie peut mettre fin au présent contrat en respectant le préavis défini dans les
            conditions d'abonnement acceptées sur la plateforme. En cas de manquement grave aux
            présentes obligations, la résiliation pourra intervenir de plein droit après mise en demeure
            restée sans effet pendant quinze (15) jours. À la date de fin effective du contrat :
          </Text>
          <Text style={styles.paragraph}>• L'accès au système sera désactivé ;</Text>
          <Text style={styles.paragraph}>• Le Client pourra, sur demande, obtenir une exportation de ses données dans un délai de trente (30) jours ;</Text>
          <Text style={styles.paragraph}>• Kelasi_Pro procèdera à la suppression définitive des données après ce délai.</Text>
        </View>

        {/* Article 10 - Limitation de Responsabilité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 10 — LIMITATION DE RESPONSABILITÉ</Text>
          <Text style={styles.paragraph}>
            La responsabilité de Kelasi_Pro ne saurait être engagée pour des dommages indirects
            résultant de l'utilisation ou de l'impossibilité d'utiliser le service, notamment en cas de force
            majeure, de défaillance de l'infrastructure Internet du Client ou d'une utilisation non
            conforme du système.
          </Text>
        </View>

        {/* Article 11 - Dispositions Générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ARTICLE 11 — DISPOSITIONS GÉNÉRALES</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.articleTitle}>Droit applicable :</Text> Le présent contrat est soumis au droit du pays du siège social de Kelasi_Pro.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.articleTitle}>Juridiction compétente :</Text> En cas de litige, les parties s'engagent à rechercher une solution
            amiable. À défaut, les tribunaux compétents du lieu du siège de Kelasi_Pro seront saisis.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.articleTitle}>Intégralité :</Text> Le présent contrat constitue l'accord complet entre les parties et annule tout
            accord antérieur portant sur le même objet.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.articleTitle}>Modifications :</Text> Toute modification doit faire l'objet d'un avenant écrit signé par les deux
            parties.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Pour KELASI_PRO</Text>
            <Text style={styles.signatureName}>Nom & Prénom : ___________________________</Text>
            <Text style={styles.signatureName}>Titre : ___________________________________</Text>
            <Text style={styles.signatureDate}>Date : {currentDate}</Text>
            <Text style={styles.signatureLabel}>Signature :</Text>
            <Text style={styles.signatureName}>___________________________</Text>
          </View>

          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Pour l'Établissement Scolaire</Text>
            <Text style={styles.signatureName}>Nom & Prénom : ___________________________</Text>
            <Text style={styles.signatureName}>Titre : ___________________________________</Text>
            <Text style={styles.signatureDate}>Date : _________________</Text>
            <Text style={styles.signatureLabel}>Signature :</Text>
            <Text style={styles.signatureName}>___________________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Document Confidentiel — KELASI_PRO © 2025 — Page 1</Text>
          <Text>Ce contrat est valide uniquement signé et daté par les deux parties.</Text>
        </View>
      </Page>
    </Document>
  );
};
