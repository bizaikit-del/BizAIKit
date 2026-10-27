import { SupportedLanguage } from '../types/index.js';

export interface TranslationDictionary {
  appName: string;
  navDashboard: string;
  navStudents: string;
  navAttendance: string;
  navMarklist: string;
  settingsTitle: string;
  roleSuperAdmin: string;
  roleTeacher: string;
  signedInAs: string;
  logout: string;
  login: string;
  searchPlaceholder: string;
  allClasses: string;
  selectClass: string;
  selectSubject: string;
  allSubjects: string;
  allTerms: string;
  statusActive: string;
  statusInactive: string;
  save: string;
  saving: string;
  saved: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  actions: string;
  confirmDelete: string;
  deactivate: string;
  activate: string;
  yes: string;
  no: string;
  filter: string;
  addStudent: string;
  manageClasses: string;
  studentNumber: string;
  fullName: string;
  gender: string;
  male: string;
  female: string;
  dob: string;
  guardianName: string;
  guardianPhone: string;
  class: string;
  status: string;
  noStudentsFound: string;
  // Dashboard
  totalStudents: string;
  totalClasses: string;
  todayAttendance: string;
  present: string;
  absent: string;
  excused: string;
  recentAssessments: string;
  classSummaries: string;
  recentTeacherActivity: string;
  averageScore: string;
  submissions: string;
  // Attendance
  colNo: string;
  colStudentName: string;
  colTotalP: string;
  colTotalA: string;
  colTotalE: string;
  colAttendancePct: string;
  colRank: string;
  addSchoolDay: string;
  date: string;
  periodName: string;
  markAllPresent: string;
  calculationRules: string;
  includeExcused: string;
  monthlyReport: string;
  termReport: string;
  printReport: string;
  exportCsv: string;
  selectMonth: string;
  // Marklist
  addAssessment: string;
  assessmentName: string;
  category: string;
  maxMarks: string;
  weight: string;
  term: string;
  totalMarks: string;
  weightedPct: string;
  grade: string;
  rank: string;
  majorExam: string;
  classTest: string;
  quiz: string;
  homework: string;
  assignment: string;
  practical: string;
  custom: string;
  invalidMark: string;
  // Settings & Admin
  userManagement: string;
  gradingScales: string;
  activityAuditLogs: string;
  databaseBackup: string;
  hostingerDeployment: string;
  addTeacher: string;
  username: string;
  password: string;
  assignedClasses: string;
  assignedSubjects: string;
  exportDatabaseJson: string;
  backupSuccess: string;
  // Feedback
  loadError: string;
  actionSuccess: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: 'Bizaikit SMS',
    navDashboard: 'Dashboard',
    navStudents: 'Students',
    navAttendance: 'Attendance',
    navMarklist: 'Marklist',
    settingsTitle: 'System Administration',
    roleSuperAdmin: 'Super Admin',
    roleTeacher: 'Teacher',
    signedInAs: 'Signed in as',
    logout: 'Sign Out',
    login: 'Sign In',
    searchPlaceholder: 'Search by name, ID number, or phone...',
    allClasses: 'All Classes',
    selectClass: 'Select Class',
    selectSubject: 'Select Subject',
    allSubjects: 'All Subjects',
    allTerms: 'All Terms',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    save: 'Save Changes',
    saving: 'Saving...',
    saved: 'All changes saved',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    actions: 'Actions',
    confirmDelete: 'Are you sure you want to delete this record?',
    deactivate: 'Deactivate',
    activate: 'Activate',
    yes: 'Yes',
    no: 'No',
    filter: 'Filter',
    addStudent: 'Register Student',
    manageClasses: 'Manage Classes',
    studentNumber: 'Student ID',
    fullName: 'Full Name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    dob: 'Date of Birth',
    guardianName: 'Guardian Name',
    guardianPhone: 'Guardian Phone',
    class: 'Class',
    status: 'Status',
    noStudentsFound: 'No students found matching your criteria.',
    totalStudents: 'Total Students',
    totalClasses: 'Total Classes',
    todayAttendance: "Today's Attendance",
    present: 'Present (P)',
    absent: 'Absent (A)',
    excused: 'Excused (E)',
    recentAssessments: 'Recent Assessments',
    classSummaries: 'Class Summaries',
    recentTeacherActivity: 'Recent Teacher Activity',
    averageScore: 'Average Score',
    submissions: 'Submissions',
    colNo: 'No.',
    colStudentName: 'Student Name',
    colTotalP: 'Total P',
    colTotalA: 'Total A',
    colTotalE: 'Total E',
    colAttendancePct: 'Attendance %',
    colRank: 'Rank',
    addSchoolDay: 'Add School Day',
    date: 'Date',
    periodName: 'Period Name',
    markAllPresent: 'Mark All Present Today',
    calculationRules: 'Calculation Rules',
    includeExcused: 'Count Excused Absences (E) in Denominator',
    monthlyReport: 'Monthly Report',
    termReport: 'Term Report',
    printReport: 'Print / Export Report',
    exportCsv: 'Export CSV',
    selectMonth: 'Select Month',
    addAssessment: 'Add Assessment Column',
    assessmentName: 'Assessment Name',
    category: 'Category',
    maxMarks: 'Max Marks',
    weight: 'Weight (%)',
    term: 'Academic Term',
    totalMarks: 'Total Marks',
    weightedPct: 'Weighted %',
    grade: 'Grade',
    rank: 'Rank',
    majorExam: 'Major Examination',
    classTest: 'Class Test',
    quiz: 'Quiz',
    homework: 'Homework',
    assignment: 'Assignment',
    practical: 'Practical Assessment',
    custom: 'Custom Assessment',
    invalidMark: 'Mark must be between 0 and max marks',
    userManagement: 'Teacher Accounts & Permissions',
    gradingScales: 'Grading Scales & Ranking Rules',
    activityAuditLogs: 'Audit Activity Trail',
    databaseBackup: 'Database Backup & Recovery',
    hostingerDeployment: 'Hostinger & bizaikit.com Guide',
    addTeacher: 'Add Teacher Account',
    username: 'Username',
    password: 'Password',
    assignedClasses: 'Assigned Classes',
    assignedSubjects: 'Assigned Subjects',
    exportDatabaseJson: 'Download Complete JSON Backup',
    backupSuccess: 'Database exported successfully.',
    loadError: 'Failed to load data. Please retry.',
    actionSuccess: 'Action completed successfully.',
  },
  so: {
    appName: 'Bizaikit SMS',
    navDashboard: 'Dashboard-ka',
    navStudents: 'Ardayda',
    navAttendance: 'Xaadirinta',
    navMarklist: 'Natiijooyinka',
    settingsTitle: 'Maamulka Nidaamka',
    roleSuperAdmin: 'Maamule Sare',
    roleTeacher: 'Macallin',
    signedInAs: 'Waxaad ku soo gashay',
    logout: 'Ka Bax',
    login: 'Soo Gal',
    searchPlaceholder: 'Ku raadi magac, lambarka ardayga, ama telefoon...',
    allClasses: 'Dhammaan Fasallada',
    selectClass: 'Dooro Fasalka',
    selectSubject: 'Dooro Maaddada',
    allSubjects: 'Dhammaan Maaddooyinka',
    allTerms: 'Dhammaan Xilliyada',
    statusActive: 'Shaqeynaya',
    statusInactive: 'Aan Shaqeynin',
    save: 'Keydi Isbeddellada',
    saving: 'Waa la keydinayaa...',
    saved: 'Dhammaan waa la keydiyay',
    cancel: 'Ka Noqo',
    close: 'Xir',
    delete: 'Tirtir',
    edit: 'Wax ka beddel',
    actions: 'Tallaabooyinka',
    confirmDelete: 'Ma hubtaa inaad tirtirto diiwaankan?',
    deactivate: 'Jooji',
    activate: 'Hawlgeli',
    yes: 'Haa',
    no: 'Maya',
    filter: 'Kala Saar',
    addStudent: 'Diiwaangeli Arday',
    manageClasses: 'Maamul Fasallada',
    studentNumber: 'Lambarka Ardayga',
    fullName: 'Magaca Buuxa',
    gender: 'Jinsiga',
    male: 'Lab',
    female: 'Dheddig',
    dob: 'Taariikhda Dhalashada',
    guardianName: 'Magaca Masuulka',
    guardianPhone: 'Telefoonka Masuulka',
    class: 'Fasalka',
    status: 'Xaaladda',
    noStudentsFound: 'Arday ku habboon lama helin.',
    totalStudents: 'Wadarta Ardayda',
    totalClasses: 'Wadarta Fasallada',
    todayAttendance: 'Xaadirinta Maanta',
    present: 'Jooga (P)',
    absent: 'Maqan (A)',
    excused: 'Cudurdaar leh (E)',
    recentAssessments: 'Imtixaannadii U Dambeeyay',
    classSummaries: 'Kooban Fasallada',
    recentTeacherActivity: 'Dhaqdhaqaaqa Macallimiinta',
    averageScore: 'Celceliska Dhibcaha',
    submissions: 'Dhiibashooyinka',
    colNo: 'Lr.',
    colStudentName: 'Magaca Ardayga',
    colTotalP: 'Wadarta P',
    colTotalA: 'Wadarta A',
    colTotalE: 'Wadarta E',
    colAttendancePct: 'Boqolkiiba %',
    colRank: 'Kaalinta',
    addSchoolDay: 'Ku dar Maalin Dugsiga',
    date: 'Taariikhda',
    periodName: 'Magaca Xilliga',
    markAllPresent: 'Dhammaan Ka Dhig Jooga Maanta',
    calculationRules: 'Shuruucda Xisaabinta',
    includeExcused: 'Ku dar Cudurdaarka (E) Wadarta Xaadirinta',
    monthlyReport: 'Warbixinta Billeedka',
    termReport: 'Warbixinta Xilliga',
    printReport: 'Daabac / Dhoofi Warbixinta',
    exportCsv: 'Dhoofi CSV',
    selectMonth: 'Dooro Bisha',
    addAssessment: 'Ku dar Qaanad Qiimeyn',
    assessmentName: 'Magaca Qiimeynta',
    category: 'Qaybta',
    maxMarks: 'Dhibcaha Ugu Sarreeya',
    weight: 'Miisaanka (%)',
    term: 'Xilliga Waxbarashada',
    totalMarks: 'Wadarta Dhibcaha',
    weightedPct: 'Boqolkiiba Miisaanka',
    grade: 'Darajada',
    rank: 'Kaalinta',
    majorExam: 'Imtixaanka Guud',
    classTest: 'Imtixaanka Fasalka',
    quiz: 'Kedis',
    homework: 'Shaqada Guriga',
    assignment: 'Qoraalka / Mashruuca',
    practical: 'Imtixaan Ficil ah',
    custom: 'Qiimeyn Gaar ah',
    invalidMark: 'Dhibcuhu waa inay u dhexeeyaan 0 iyo dhibcaha ugu sarreeya',
    userManagement: 'Akoonnada Macallimiinta & Oggolaanshaha',
    gradingScales: 'Qiyaasta Darajooyinka & Kaalmaha',
    activityAuditLogs: 'Diiwaanka Dhaqdhaqaaqa Nidaamka',
    databaseBackup: 'Kaydinta & Soo Celinta Database-ka',
    hostingerDeployment: 'Hagaha Hostinger & bizaikit.com',
    addTeacher: 'Ku dar Akoon Macallin',
    username: 'Magaca Gelitaanka',
    password: 'Furaha Sirta',
    assignedClasses: 'Fasallada Loo Qoondeeyay',
    assignedSubjects: 'Maaddooyinka Loo Qoondeeyay',
    exportDatabaseJson: 'Soo Dejiso Kaydka JSON Buuxa',
    backupSuccess: 'Database-ka si guul leh ayaa loo dhoofiyay.',
    loadError: 'Xogta lama soo shubi karin.',
    actionSuccess: 'Hawsha si guul ah ayaa loo dhammaystiray.',
  },
  om: {
    appName: 'Bizaikit SMS',
    navDashboard: 'Daashboordii',
    navStudents: 'Barattoota',
    navAttendance: 'Hordoffii Argamaa',
    navMarklist: 'Qabxii / Madaallii',
    settingsTitle: 'Bulchiinsa Sirnichaa',
    roleSuperAdmin: 'Bulchaa Ol’aanaa',
    roleTeacher: 'Barsiisaa',
    signedInAs: 'Kanaan seente',
    logout: "Ba'i",
    login: 'Seeni',
    searchPlaceholder: 'Maqaan, lakk. barataatiin ykn bilbilaan barbaadi...',
    allClasses: 'Kutaalee Hunda',
    selectClass: 'Kutaa Filadhu',
    selectSubject: 'Gosa Barnootaa Filadhu',
    allSubjects: 'Gosa Barnootaa Hunda',
    allTerms: 'Waqtiiwwan Hunda',
    statusActive: 'Hojjataa Jira',
    statusInactive: 'Hojjataa Hin Jiru',
    save: 'Jijjiirama Galmeessi',
    saving: 'Galmaa’aa jira...',
    saved: 'Hundi galmeeffameera',
    cancel: 'Dhiisi',
    close: 'Cufi',
    delete: 'Haqi',
    edit: 'Gulaali',
    actions: 'Tarkaanfiiwwan',
    confirmDelete: 'Galmee kana haquuf mirkaneessitaa?',
    deactivate: 'Dhaabi',
    activate: 'Kakaasi',
    yes: 'Eeyyee',
    no: 'Lakki',
    filter: 'Calali',
    addStudent: 'Barataa Galmeessi',
    manageClasses: 'Kutaalee Bulchi',
    studentNumber: 'Lakk. Barataa',
    fullName: 'Maqaa Guutuu',
    gender: 'Korniyaa',
    male: 'Dhiira',
    female: 'Dubara',
    dob: 'Guyyaa Dhalootaa',
    guardianName: 'Maqaa Guddistuu',
    guardianPhone: 'Bilbila Guddistuu',
    class: 'Kutaa',
    status: 'Haala',
    noStudentsFound: 'Barattoonni hin argamne.',
    totalStudents: "Ida'ama Barattootaa",
    totalClasses: "Ida'ama Kutaalee",
    todayAttendance: 'Argama Har’aa',
    present: 'Argameera (P)',
    absent: 'Hafaniiru (A)',
    excused: 'Hayyamame (E)',
    recentAssessments: 'Madaallii Dhihoo',
    classSummaries: 'Cuunfaa Kutaalee',
    recentTeacherActivity: 'Sochii Barsiisotaa Dhihoo',
    averageScore: 'Qabxii Giddu-galeessaa',
    submissions: 'Galiiwwan',
    colNo: 'Lakk.',
    colStudentName: 'Maqaa Barataa',
    colTotalP: 'Ida’ama P',
    colTotalA: 'Ida’ama A',
    colTotalE: 'Ida’ama E',
    colAttendancePct: 'Dhibbeentaa Argamaa %',
    colRank: 'Sadarkaa',
    addSchoolDay: 'Guyyaa Barnootaa Dabali',
    date: 'Guyyaa',
    periodName: 'Maqaa Yeroo',
    markAllPresent: 'Hunda Har’a Argamaniiru Godhi',
    calculationRules: 'Seera Shallaggii',
    includeExcused: 'Hayyama (E) Shallaggii Keessatti Dabali',
    monthlyReport: 'Gabaasa Ji’aa',
    termReport: 'Gabaasa Waqtii',
    printReport: 'Maxxansi / Baasi Gabaasa',
    exportCsv: 'CSV Baasi',
    selectMonth: 'Ji’a Filadhu',
    addAssessment: 'Madaallii Dabali',
    assessmentName: 'Maqaa Madaallii',
    category: 'Gosa Madaallii',
    maxMarks: 'Qabxii Ol’aanaa',
    weight: 'Ulfaatina (%)',
    term: 'Waqtii Barnootaa',
    totalMarks: 'Ida’ama Qabxii',
    weightedPct: 'Dhibbeentaa Madaallii',
    grade: 'Giraadii',
    rank: 'Sadarkaa',
    majorExam: 'Qormaata Guddaa',
    classTest: 'Qormaata Kutaa',
    quiz: 'Kwiizii',
    homework: 'Hojii Manaa',
    assignment: 'Assaayinmantii',
    practical: 'Madaallii Qabatamaa',
    custom: 'Madaallii Addaa',
    invalidMark: 'Qabxiin 0 fi qabxii ol’aanaa gidduu ta’uu qaba',
    userManagement: 'Akkaawuntii Barsiisotaa & Eeyyama',
    gradingScales: 'Safartuu Giraadii & Sadarkaa',
    activityAuditLogs: 'Galmee Sochii Sirnichaa',
    databaseBackup: 'Kuusaa Eeguu & Deebisuu',
    hostingerDeployment: 'Qajeelfama Hostinger & bizaikit.com',
    addTeacher: 'Barsiisaa Dabali',
    username: 'Maqaa Fayyadamaa',
    password: 'Jecha Icceetii',
    assignedClasses: 'Kutaalee Ramadaman',
    assignedSubjects: 'Gosa Barnootaa Ramadaman',
    exportDatabaseJson: 'Kuusaa JSON Guutuu Buufadhu',
    backupSuccess: 'Kuusaan milkaa’inaan baafameera.',
    loadError: 'Odeeffannoo fe’uun hin danda’amne.',
    actionSuccess: 'Tarkaanfiin milkaa’inaan xumurameera.',
  },
  am: {
    appName: 'ቢዛይኪት SMS',
    navDashboard: 'ዳሽቦርድ',
    navStudents: 'ተማሪዎች',
    navAttendance: 'የክትትል ምዝገባ (አቴንዳንስ)',
    navMarklist: 'የውጤት ዝርዝር',
    settingsTitle: 'የስርዓት አስተዳደር',
    roleSuperAdmin: 'ዋና አስተዳዳሪ',
    roleTeacher: 'መምህር',
    signedInAs: 'የገቡበት መለያ',
    logout: 'ውጣ',
    login: 'ግባ',
    searchPlaceholder: 'በስም፣ በተማሪ መለያ ወይም በስልክ ፈልግ...',
    allClasses: 'ሁሉም ክፍሎች',
    selectClass: 'ክፍል ይምረጡ',
    selectSubject: 'የትምህርት አይነት ይምረጡ',
    allSubjects: 'ሁሉም የትምህርት አይነቶች',
    allTerms: 'ሁሉም የትምህርት ክፍለ ጊዜያት',
    statusActive: 'ንቁ',
    statusInactive: 'ንቁ ያልሆነ',
    save: 'ለውጦችን መዝግብ',
    saving: 'በመመዝገብ ላይ...',
    saved: 'ሁሉም ለውጦች ተቀምጠዋል',
    cancel: 'ሰርዝ',
    close: 'ዝጋ',
    delete: 'አጥፋ',
    edit: 'አስተካክል',
    actions: 'ተግባራት',
    confirmDelete: 'ይህን መረጃ በእርግጠኝነት ማጥፋት ይፈልጋሉ?',
    deactivate: 'አቦዝን',
    activate: 'አንቃ',
    yes: 'አዎ',
    no: 'አይደለም',
    filter: 'አጣራ',
    addStudent: 'ተማሪ መዝግብ',
    manageClasses: 'ክፍሎችን አስተዳድር',
    studentNumber: 'የተማሪ ቁጥር (ID)',
    fullName: 'ሙሉ ስም',
    gender: 'ጾታ',
    male: 'ወንድ',
    female: 'ሴት',
    dob: 'የትውልድ ቀን',
    guardianName: 'የአሳዳጊ ስም',
    guardianPhone: 'የአሳዳጊ ስልክ',
    class: 'ክፍል',
    status: 'ሁኔታ',
    noStudentsFound: 'የተፈለገው ተማሪ አልተገኘም።',
    totalStudents: 'አጠቃላይ ተማሪዎች',
    totalClasses: 'አጠቃላይ ክፍሎች',
    todayAttendance: 'የዛሬ ክትትል',
    present: 'የተገኙ (P)',
    absent: 'ያልተገኙ (A)',
    excused: 'በፈቃድ (E)',
    recentAssessments: 'የቅርብ ጊዜ ምዘናዎች',
    classSummaries: 'የክፍሎች ማጠቃለያ',
    recentTeacherActivity: 'የመምህራን የቅርብ ጊዜ እንቅስቃሴ',
    averageScore: 'አማካይ ውጤት',
    submissions: 'የገቡ ውጤቶች',
    colNo: 'ተ.ቁ',
    colStudentName: 'የተማሪ ስም',
    colTotalP: 'ድምር P',
    colTotalA: 'ድምር A',
    colTotalE: 'ድምር E',
    colAttendancePct: 'የመገኘት መቶኛ %',
    colRank: 'ደረጃ',
    addSchoolDay: 'የትምህርት ቀን ጨምር',
    date: 'ቀን',
    periodName: 'የክፍለ ጊዜ ስም',
    markAllPresent: 'ሁሉንም ዛሬ እንደተገኙ መዝግብ',
    calculationRules: 'የስሌት ደንቦች',
    includeExcused: 'ፈቃድን (E) በስሌቱ ማካተት',
    monthlyReport: 'የወር ሪፖርት',
    termReport: 'የሴሚስተር ሪፖርት',
    printReport: 'ሪፖርት አትም / አውርድ',
    exportCsv: 'በ CSV አውርድ',
    selectMonth: 'ወር ይምረጡ',
    addAssessment: 'የምዘና አምድ ጨምር',
    assessmentName: 'የምዘና ስም',
    category: 'የምዘና አይነት',
    maxMarks: 'ከፍተኛ ውጤት',
    weight: 'ክብደት (%)',
    term: 'ሴሚስተር / ሩብ ዓመት',
    totalMarks: 'ድምር ውጤት',
    weightedPct: 'የተመዘነ መቶኛ %',
    grade: 'ግሬድ',
    rank: 'ደረጃ',
    majorExam: 'ዋና ፈተና',
    classTest: 'የክፍል ፈተና',
    quiz: 'ፈጣን ጥያቄ (ኩዊዝ)',
    homework: 'የቤት ስራ',
    assignment: 'የጥናት ጽሁፍ / አሳይንመንት',
    practical: 'ተግባራዊ ፈተና',
    custom: 'ልዩ ምዘና',
    invalidMark: 'ውጤት በ 0 እና በከፍተኛው ውጤት መካከል መሆን አለበት',
    userManagement: 'የመምህራን መለያዎች እና ፈቃዶች',
    gradingScales: 'የግሬድ መስፈርቶች እና የደረጃ ደንቦች',
    activityAuditLogs: 'የስርዓት እንቅስቃሴ መዝገብ',
    databaseBackup: 'የመረጃ ቋት (ዳታቤዝ) ምትክ እና መልሶ ማግኛ',
    hostingerDeployment: 'የ Hostinger እና bizaikit.com መመሪያ',
    addTeacher: 'መምህር መዝግብ',
    username: 'የተጠቃሚ ስም',
    password: 'የይለፍ ቃል',
    assignedClasses: 'የተመደቡባቸው ክፍሎች',
    assignedSubjects: 'የተመደቡባቸው ትምህርቶች',
    exportDatabaseJson: 'ሙሉ የዳታቤዝ ምትክ በ JSON አውርድ',
    backupSuccess: 'የመረጃ ምትክ በተሳካ ሁኔታ ወርዷል።',
    loadError: 'መረጃውን መጫን አልተቻለም።',
    actionSuccess: 'ተግባሩ በተሳካ ሁኔታ ተከናውኗል።',
  },
};
