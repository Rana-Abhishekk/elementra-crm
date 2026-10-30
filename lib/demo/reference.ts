// Synthetic reference data (02_REFERENCE_DATA §5, §6, §9.6). No real people.
import type { TemplateCategory, TemplateStatus } from "@prisma/client";

export const DEMO_PASSWORD = "Demo@1234";

export interface DemoUser {
  name: string;
  email: string;
  /** Role name from the Role master (lib/domain/masters/defaults.ts) */
  role: string;
  branchCode: string | null;
  extraBranchCodes?: string[];
  receivesLeads: boolean;
  phone: string;
  employeeCode: string;
  designation: string;
  reportsTo?: string; // email
}

export const DEMO_USERS: DemoUser[] = [
  { name: "Aarav Mehta", email: "aarav@elementra.test", role: "Super Admin", branchCode: null, receivesLeads: false, phone: "+919000090001", employeeCode: "EMP-001", designation: "Director" },
  { name: "Ananya Rao", email: "ananya@elementra.test", role: "Online Desk", branchCode: "ONL", receivesLeads: true, phone: "+919000090002", employeeCode: "EMP-002", designation: "Pre-sales Executive", reportsTo: "aarav@elementra.test" },
  { name: "Sara Khan", email: "sara@elementra.test", role: "Online Desk", branchCode: "ONL", receivesLeads: true, phone: "+919000090003", employeeCode: "EMP-003", designation: "Pre-sales Executive", reportsTo: "aarav@elementra.test" },
  { name: "Kabir Malhotra", email: "kabir@elementra.test", role: "Branch Manager", branchCode: "WOR", receivesLeads: false, phone: "+919000090004", employeeCode: "EMP-004", designation: "Branch Manager", reportsTo: "aarav@elementra.test" },
  { name: "Ishita Desai", email: "ishita@elementra.test", role: "Sales Executive", branchCode: "WOR", receivesLeads: true, phone: "+919000090005", employeeCode: "EMP-005", designation: "Sales Executive", reportsTo: "kabir@elementra.test" },
  { name: "Rohan Pillai", email: "rohan@elementra.test", role: "Sales Executive", branchCode: "WOR", receivesLeads: true, phone: "+919000090006", employeeCode: "EMP-006", designation: "Sales Executive", reportsTo: "kabir@elementra.test" },
  { name: "Farah Siddiqui", email: "farah@elementra.test", role: "Branch Manager", branchCode: "AND", receivesLeads: false, phone: "+919000090007", employeeCode: "EMP-007", designation: "Branch Manager", reportsTo: "aarav@elementra.test" },
  { name: "Arjun Nair", email: "arjun@elementra.test", role: "Sales Executive", branchCode: "AND", receivesLeads: true, phone: "+919000090008", employeeCode: "EMP-008", designation: "Sales Executive", reportsTo: "farah@elementra.test" },
  { name: "Meera Joshi", email: "meera@elementra.test", role: "Sales Executive", branchCode: "AND", receivesLeads: true, phone: "+919000090009", employeeCode: "EMP-009", designation: "Sales Executive", reportsTo: "farah@elementra.test" },
  { name: "Tanvi Shah", email: "tanvi@elementra.test", role: "Branch Manager", branchCode: "TAR", receivesLeads: true, phone: "+919000090010", employeeCode: "EMP-010", designation: "Branch Manager", reportsTo: "aarav@elementra.test" },
  { name: "Dev Bhatia", email: "dev@elementra.test", role: "Sales Executive", branchCode: "TAR", receivesLeads: true, phone: "+919000090011", employeeCode: "EMP-011", designation: "Sales Executive", reportsTo: "tanvi@elementra.test" },
  { name: "Sneha Kulkarni", email: "sneha@elementra.test", role: "Branch Manager", branchCode: "PUN", receivesLeads: true, phone: "+919000090012", employeeCode: "EMP-012", designation: "Branch Manager", reportsTo: "aarav@elementra.test" },
  { name: "Vikram Sethi", email: "vikram@elementra.test", role: "Branch Manager", branchCode: "WOR", extraBranchCodes: ["AND", "TAR"], receivesLeads: false, phone: "+919000090014", employeeCode: "EMP-014", designation: "Regional Manager — Mumbai", reportsTo: "aarav@elementra.test" },
  { name: "Omkar Patil", email: "omkar@elementra.test", role: "Sales Executive", branchCode: "PUN", receivesLeads: true, phone: "+919000090013", employeeCode: "EMP-013", designation: "Sales Executive", reportsTo: "sneha@elementra.test" },
];

export const QUICK_LOGINS = [
  { label: "Super Admin", who: "Aarav", email: "aarav@elementra.test" },
  { label: "Online Desk", who: "Ananya", email: "ananya@elementra.test" },
  { label: "Worli Manager", who: "Kabir", email: "kabir@elementra.test" },
  { label: "Regional Mgr", who: "Vikram", email: "vikram@elementra.test" },
  { label: "Pune Manager", who: "Sneha", email: "sneha@elementra.test" },
  { label: "Andheri Exec", who: "Arjun", email: "arjun@elementra.test" },
  { label: "Pune Exec", who: "Omkar", email: "omkar@elementra.test" },
];

export interface TemplateSeed {
  code: string;
  language: "en" | "hi";
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  body: string;
}

export const TEMPLATES: TemplateSeed[] = [
  { code: "welcome_enquiry", language: "en", name: "Welcome (routed)", category: "UTILITY", status: "APPROVED", body: "Hi {{name}}, thank you for your interest in Elementra {{product}}. {{rep_name}} from our {{branch}} Experience Centre will call you shortly. If you have a floor plan, feel free to share it here." },
  { code: "welcome_enquiry", language: "hi", name: "Welcome (routed)", category: "UTILITY", status: "APPROVED", body: "नमस्ते {{name}} जी, Elementra में आपकी रुचि के लिए धन्यवाद। हमारे {{branch}} एक्सपीरियंस सेंटर से {{rep_name}} जल्द ही आपको कॉल करेंगे। अगर आपके पास फ्लोर प्लान है, तो आप उसे यहीं भेज सकते हैं।" },
  { code: "welcome_no_location", language: "en", name: "Welcome (ask location)", category: "UTILITY", status: "APPROVED", body: "Hi {{name}}, thank you for contacting Elementra. Could you share your site's area or pincode? It helps us connect you with the nearest Experience Centre." },
  { code: "welcome_no_location", language: "hi", name: "Welcome (ask location)", category: "UTILITY", status: "APPROVED", body: "नमस्ते {{name}} जी, Elementra से संपर्क करने के लिए धन्यवाद। कृपया अपनी साइट का एरिया या पिनकोड बताएं, ताकि हम आपको नज़दीकी एक्सपीरियंस सेंटर से जोड़ सकें।" },
  { code: "appointment_reminder", language: "en", name: "Showroom visit reminder", category: "UTILITY", status: "APPROVED", body: "Hi {{name}}, a gentle reminder of your visit to the Elementra {{branch}} Experience Centre on {{date}} at {{time}}. {{host_name}} will host you. Location: {{map_link}}" },
  { code: "appointment_reminder", language: "hi", name: "Showroom visit reminder", category: "UTILITY", status: "APPROVED", body: "नमस्ते {{name}} जी, याद दिला दें कि {{date}} को {{time}} बजे Elementra {{branch}} एक्सपीरियंस सेंटर में आपकी विज़िट तय है। {{host_name}} आपका स्वागत करेंगे। लोकेशन: {{map_link}}" },
  { code: "quotation_follow_up", language: "en", name: "Quotation follow-up", category: "UTILITY", status: "PENDING_APPROVAL", body: "Hi {{name}}, did you get a chance to look at the quotation we shared on {{date}}? {{rep_name}} is happy to walk you through finish options that fit your budget." },
  { code: "follow_up_nudge", language: "en", name: "Follow-up nudge", category: "MARKETING", status: "PENDING_APPROVAL", body: "Hi {{name}}, checking in on your {{product}} plans. Would you like a quick estimate or a visit to our {{branch}} Experience Centre? Reply here and we'll set it up." },
  { code: "close_the_loop", language: "en", name: "Close the loop", category: "UTILITY", status: "DRAFT", body: "Hi {{name}}, we've tried reaching you a few times. If you've decided to go another way, that's completely fine — a quick reply helps us close this on our side. If you'd still like to go ahead, just reply \"Yes\" and we'll call you." },
  { code: "out_of_area_regret", language: "en", name: "Out of area (regret)", category: "UTILITY", status: "APPROVED", body: "Hi {{name}}, thank you for considering Elementra. We currently serve Mumbai, Thane, Navi Mumbai and Pune, so we're unable to take up a project at {{location}} right now. We'll keep your details and reach out if we start serving your area." },
  { code: "out_of_area_regret", language: "hi", name: "Out of area (regret)", category: "UTILITY", status: "APPROVED", body: "नमस्ते {{name}} जी, Elementra में रुचि के लिए धन्यवाद। अभी हम मुंबई, ठाणे, नवी मुंबई और पुणे में सेवा देते हैं, इसलिए {{location}} में प्रोजेक्ट नहीं ले पाएंगे। हम आपकी जानकारी रखेंगे और आपके क्षेत्र में सेवा शुरू होने पर संपर्क करेंगे।" },
];

export const ARCHITECTS = [
  { firm: "Studio Kaavya", first: "Kaavya", last: "Rao", commission: 8, phone: "+919000080001" },
  { firm: "Line & Light Design", first: "Nikhil", last: "Batra", commission: 7.5, phone: "+919000080002" },
  { firm: "Form Atelier", first: "Rhea", last: "D'Souza", commission: 10, phone: "+919000080003" },
  { firm: "Studio Nine Interiors", first: "Pooja", last: "Menon", commission: 8, phone: "+919000080004" },
  { firm: "Arcade Design Co.", first: "Imran", last: "Patel", commission: 5, phone: "+919000080005" },
  { firm: "Blank Canvas Studio", first: "Mehul", last: "Shah", commission: 6, phone: "+919000080006" },
];
