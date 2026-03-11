import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Locale } from "@/i18n/translations";
import SettingsClient from "@/components/dashboard/settings/SettingsClient";

export const dynamic = "force-dynamic";

const settingsStrings = {
  en: {
    title: "Settings",
    subtitle: "Manage the athlete profile used across imports, filters, and coach sharing.",
    account: {
      heading: "Connected account",
      description: "Your Google login can stay as-is. Athlete data may come from PDFs and can be adjusted here.",
      email: "Email",
      provider: "Signed in with Google",
    },
    athlete: {
      heading: "Athlete profile",
      description: "These details are used for category filters, profile summaries, and ABMN imports.",
      photo: "Profile photo",
      photoHint: "Upload a square photo for the sidebar and athlete profile.",
      photoCta: "Choose photo",
      photoReplace: "Replace photo",
      photoRemove: "Remove photo",
      photoRequirements: "JPG, PNG, or WEBP. The app resizes it automatically.",
      name: "Athlete display name",
      birthDate: "Birth date",
      gender: "Gender",
      abmn: "ABMN registration",
      abmnHint: "Used to preload the assisted ABMN import flow.",
    },
    coach: {
      heading: "Coach connection",
      description: "This is the coach currently linked to your athlete profile.",
      empty: "No coach linked yet.",
      linkedCoach: "Linked coach",
      club: "Club",
    },
    danger: {
      heading: "Danger zone",
      description: "Delete your account and all imported race data permanently.",
      cta: "Delete account",
      confirm: "Delete your account and all race data permanently? This cannot be undone.",
    },
    genderOptions: {
      unset: "Prefer not to say",
      female: "Female",
      male: "Male",
      other: "Other",
    },
    actions: {
      save: "Save settings",
      saving: "Saving...",
      signOut: "Sign out",
      deleting: "Deleting...",
    },
    alerts: {
      saved: "Settings updated successfully.",
      error: "We couldn't complete that action. Try again.",
      invalidPhoto: "Choose a JPG, PNG, or WEBP image.",
      photoTooLarge: "The image is too large. Try another file.",
    },
  },
  "pt-BR": {
    title: "Configuracoes",
    subtitle: "Gerencie o perfil de atleta usado nas importacoes, filtros e compartilhamento com o tecnico.",
    account: {
      heading: "Conta conectada",
      description: "Seu login do Google pode continuar como esta. Os dados da atleta podem vir dos PDFs e ser ajustados aqui.",
      email: "E-mail",
      provider: "Conectado com Google",
    },
    athlete: {
      heading: "Perfil da atleta",
      description: "Esses dados sao usados nos filtros por categoria, resumos do perfil e importacoes da ABMN.",
      photo: "Foto de perfil",
      photoHint: "Envie uma foto quadrada para o menu lateral e o perfil da atleta.",
      photoCta: "Escolher foto",
      photoReplace: "Trocar foto",
      photoRemove: "Remover foto",
      photoRequirements: "JPG, PNG ou WEBP. O app redimensiona automaticamente.",
      name: "Nome exibido da atleta",
      birthDate: "Nascimento",
      gender: "Genero",
      abmn: "Matricula ABMN",
      abmnHint: "Usada para preencher automaticamente a importacao assistida da ABMN.",
    },
    coach: {
      heading: "Vinculo com tecnico",
      description: "Este e o tecnico atualmente ligado ao seu perfil de atleta.",
      empty: "Nenhum tecnico vinculado ainda.",
      linkedCoach: "Tecnico vinculado",
      club: "Clube",
    },
    danger: {
      heading: "Zona de perigo",
      description: "Exclua sua conta e todos os resultados importados de forma permanente.",
      cta: "Excluir conta",
      confirm: "Excluir a conta e todos os dados de provas permanentemente? Essa acao nao pode ser desfeita.",
    },
    genderOptions: {
      unset: "Prefiro nao informar",
      female: "Feminino",
      male: "Masculino",
      other: "Outro",
    },
    actions: {
      save: "Salvar configuracoes",
      saving: "Salvando...",
      signOut: "Sair",
      deleting: "Excluindo...",
    },
    alerts: {
      saved: "Configuracoes atualizadas com sucesso.",
      error: "Nao foi possivel concluir essa acao. Tente novamente.",
      invalidPhoto: "Escolha uma imagem JPG, PNG ou WEBP.",
      photoTooLarge: "A imagem esta muito grande. Tente outro arquivo.",
    },
  },
  es: {
    title: "Configuracion",
    subtitle: "Gestiona el perfil del atleta usado en importaciones, filtros y el intercambio con el entrenador.",
    account: {
      heading: "Cuenta conectada",
      description: "Tu acceso con Google puede seguir igual. Los datos del atleta pueden venir de los PDFs y ajustarse aqui.",
      email: "Correo",
      provider: "Conectado con Google",
    },
    athlete: {
      heading: "Perfil del atleta",
      description: "Estos datos se usan en los filtros por categoria, resumenes del perfil e importaciones ABMN.",
      photo: "Foto de perfil",
      photoHint: "Sube una foto cuadrada para el menu lateral y el perfil del atleta.",
      photoCta: "Elegir foto",
      photoReplace: "Cambiar foto",
      photoRemove: "Quitar foto",
      photoRequirements: "JPG, PNG o WEBP. La app la redimensiona automaticamente.",
      name: "Nombre mostrado del atleta",
      birthDate: "Nacimiento",
      gender: "Genero",
      abmn: "Matricula ABMN",
      abmnHint: "Se usa para completar automaticamente la importacion asistida de ABMN.",
    },
    coach: {
      heading: "Vinculo con entrenador",
      description: "Este es el entrenador actualmente vinculado a tu perfil de atleta.",
      empty: "Aun no hay entrenador vinculado.",
      linkedCoach: "Entrenador vinculado",
      club: "Club",
    },
    danger: {
      heading: "Zona de riesgo",
      description: "Elimina tu cuenta y todos los resultados importados de forma permanente.",
      cta: "Eliminar cuenta",
      confirm: "Eliminar la cuenta y todos los datos de pruebas permanentemente? Esta accion no se puede deshacer.",
    },
    genderOptions: {
      unset: "Prefiero no decirlo",
      female: "Femenino",
      male: "Masculino",
      other: "Otro",
    },
    actions: {
      save: "Guardar configuracion",
      saving: "Guardando...",
      signOut: "Cerrar sesion",
      deleting: "Eliminando...",
    },
    alerts: {
      saved: "Configuracion actualizada correctamente.",
      error: "No pudimos completar esa accion. Intentalo de nuevo.",
      invalidPhoto: "Elige una imagen JPG, PNG o WEBP.",
      photoTooLarge: "La imagen es demasiado grande. Prueba otro archivo.",
    },
  },
} as const;

const toDateInput = (value: Date | null | undefined) => {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard/settings");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const strings = settingsStrings[locale];

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      athleteProfile: {
        include: {
          coach: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!user) redirect("/api/auth/signin?callbackUrl=/dashboard/settings");

  return (
    <SettingsClient
      strings={strings}
      initialValues={{
        name: user.name ?? "",
        email: user.email ?? "",
        birthDate: toDateInput(user.birthDate),
        gender: user.gender ?? "",
        abmnRegistrationNumber: user.athleteProfile?.abmnRegistrationNumber ?? "",
        image: user.image ?? null,
      }}
      coach={{
        name: user.athleteProfile?.coach?.user?.name ?? null,
        clubName: user.athleteProfile?.coach?.clubName ?? null,
      }}
    />
  );
}
