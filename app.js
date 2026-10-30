(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const clean = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const initials = (name = "") => name.replace(/^Dr\.\s*/i, "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const today = () => new Date().toISOString().slice(0, 10);
  const prettyDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"});
  const idNumber = (id) => Number(String(id).replace(/\D/g, "")) || 0;

  let state = copy(window.MEDIRECORD_DEFAULT_STATE);
  let currentUser = null;
  let appointmentFilter = "all";
  let toastTimer;

  const credentials = {
    admin:{username:"admin", password:"admin123", name:"Administrator", initials:"AD"},
    doctor:{username:"doctor", password:"doctor123", name:"Duty Doctor", initials:"DR"},
    receptionist:{username:"reception", password:"reception123", name:"Receptionist", initials:"RC"}
  };

  async function hydrateState() {
    if (window.MEDIRECORD_USE_API) {
      try {
        const response = await fetch("/api/state");
        if (response.ok) {
          const databaseState = await response.json();
          if (databaseState.patients && databaseState.patients.length) state = databaseState;
          else await persist();
        }
      } catch (error) {
        console.warn("Using sample state because the local API is unavailable.", error);
      }
    } else {
      const saved = localStorage.getItem("medirecord-state-v1");
      if (saved) {
        try { state = JSON.parse(saved); } catch (_) { /* keep clean sample state */ }
      }
    }
  }

  async function persist() {
    state.indexKeys = [...new Set(state.patients.map((patient) => patient.id).concat(state.indexKeys || []))].sort((a,b) => idNumber(a)-idNumber(b));
    if (window.MEDIRECORD_USE_API) {
      try {
        await fetch("/api/state", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(state)});
      } catch (error) { console.warn("Local database sync failed.", error); }
    } else {
      localStorage.setItem("medirecord-state-v1", JSON.stringify(state));
    }
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
  }

  function priorityClass(priority) { return String(priority).toLowerCase(); }
  function priorityPill(priority) { return `<span class="pill ${priorityClass(priority)}">${clean(priority)}</span>`; }
  function patientById(id) { return state.patients.find((patient) => patient.id === id); }
  function doctorById(id) { return state.doctors.find((doctor) => doctor.id === id); }
  function nextId(prefix, list) {
    const max = Math.max(...list.map((item) => idNumber(item.id)), prefix === "P" ? 1000 : prefix === "D" ? 100 : 200);
    return `${prefix}${max + 1}`;
  }

  function populateSelects() {
    const departmentOptions = state.departments.map((department) => `<option>${clean(department)}</option>`).join("");
    $("#patientDepartment").innerHTML = departmentOptions;
    $("#doctorDepartment").innerHTML = departmentOptions;
    $("#patientDepartmentFilter").innerHTML = `<option value="">All departments</option>${departmentOptions}`;
    const patientOptions = state.patients.map((patient) => `<option value="${patient.id}">${patient.id} · ${clean(patient.name)}</option>`).join("");
    ["#assessmentPatient", "#appointmentPatient", "#relationshipPatient"].forEach((selector) => $(selector).innerHTML = patientOptions);
    $("#appointmentDoctor").innerHTML = state.doctors.map((doctor) => `<option value="${doctor.id}">${clean(doctor.name)} · ${clean(doctor.department)}</option>`).join("");
  }

  function login(event) {
    event.preventDefault();
    const role = $("#loginRole").value;
    const account = credentials[role];
    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;
    if (username !== account.username || password !== account.password) {
      $("#loginError").textContent = "The username, password or selected role is incorrect.";
      return;
    }
    currentUser = {role, ...account};
    $("#loginError").textContent = "";
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    $("#currentUser").textContent = account.name;
    $("#currentRole").textContent = `${role[0].toUpperCase()+role.slice(1)} access`;
    $("#userInitials").textContent = account.initials;
    $("#pageTitle").textContent = `Good morning, ${account.name}`;
    changePage("dashboard");
    renderAll();
  }

  function logout() {
    currentUser = null;
    $("#appShell").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
    $("#loginPassword").value = "";
  }

  const pageNames = {
    dashboard:["HOSPITAL OPERATIONS", "Hospital overview"], patients:["RECORD MANAGEMENT", "Patient records"], assessment:["DECISION SUPPORT", "Care assessment"], queue:["CARE FLOW", "Emergency queue"], doctors:["STAFF MANAGEMENT", "Doctors"], appointments:["CARE SCHEDULE", "Appointments"], relationships:["RELATIONSHIP ANALYSIS", "Patient–doctor map"], resources:["CAPACITY MANAGEMENT", "Hospital resources"], indexing:["SCALABLE RETRIEVAL", "Patient index"], algorithms:["TECHNICAL DEMONSTRATION", "Performance lab"]
  };

  function changePage(page) {
    $$(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
    $("#pageEyebrow").textContent = pageNames[page][0];
    $("#pageTitle").textContent = pageNames[page][1];
    $(".sidebar").classList.remove("open");
    if (page === "relationships") renderRelationshipMap();
    if (page === "indexing") renderBPlusTree();
    if (page === "algorithms") renderAlgorithmDefaults();
  }

  function renderDashboard() {
    const todayAppointments = state.appointments.filter((appointment) => appointment.date === today() && appointment.status === "Scheduled");
    const emergency = state.patients.filter((patient) => ["Critical", "High"].includes(patient.priority) && !["Completed","Normal"].includes(patient.queueStatus));
    const bedResources = state.resources.filter((resource) => /bed/i.test(resource.name));
    const availableBeds = bedResources.reduce((total, resource) => total + resource.total - resource.occupied, 0);
    const occupiedBeds = bedResources.reduce((total, resource) => total + resource.occupied, 0);
    const icu = state.resources.find((resource) => resource.code === "ICU");
    const metrics = [
      ["PT", "Total patients", state.patients.length], ["DR", "Total doctors", state.doctors.length], ["AP", "Today's appointments", todayAppointments.length], ["ER", "Emergency patients", emergency.length],
      ["BD", "Available beds", availableBeds], ["OB", "Occupied beds", occupiedBeds], ["IC", "Available ICU beds", icu.total-icu.occupied], ["TR", "Pending treatments", state.patients.filter((p) => p.queueStatus === "Waiting").length]
    ];
    $("#metricGrid").innerHTML = metrics.map(([icon,label,value]) => `<article class="metric-card"><div><small>${label}</small><strong>${value}</strong></div><span class="metric-icon">${icon}</span></article>`).join("");

    const counts = state.departments.map((department) => [department, state.patients.filter((patient) => patient.department === department).length]);
    const max = Math.max(...counts.map((entry) => entry[1]), 1);
    $("#departmentChart").innerHTML = counts.map(([department,count]) => `<div class="bar-row"><span>${clean(department)}</span><div class="bar-track"><div class="bar-fill" style="width:${(count/max)*100}%"></div></div><b>${count}</b></div>`).join("");

    const urgent = state.patients.filter((patient) => ["Critical","High"].includes(patient.priority)).length;
    const normal = state.patients.length - urgent;
    const urgentPercent = Math.round((urgent / Math.max(state.patients.length,1))*100);
    $("#priorityDonut").innerHTML = `<div><div class="donut" style="background:conic-gradient(#cc4b55 0 ${urgentPercent}%,#2ca589 ${urgentPercent}% 100%)"><div class="donut-center"><b>${urgent}</b><small>urgent</small></div></div><div class="donut-legend"><span>● Urgent ${urgent}</span><span>● Routine ${normal}</span></div></div>`;

    $("#todayAppointments").innerHTML = todayAppointments.length ? todayAppointments.slice(0,5).map((appointment) => {
      const patient = patientById(appointment.patientId); const doctor = doctorById(appointment.doctorId);
      return `<div class="list-row"><div class="person-cell"><span class="avatar">${initials(patient?.name)}</span><div><b>${clean(patient?.name || "Unknown patient")}</b><small>${clean(doctor?.name || "Unassigned")} · ${appointment.time}</small></div></div>${priorityPill(patient?.priority || "Low")}</div>`;
    }).join("") : `<div class="empty-state"><p>No appointments scheduled for today.</p></div>`;

    $("#resourceSummary").innerHTML = state.resources.slice(0,4).map((resource) => { const used = Math.round(resource.occupied/resource.total*100); return `<div class="progress-line"><div class="progress-label"><span>${clean(resource.name)}</span><b>${resource.total-resource.occupied} available</b></div><div class="progress-track"><i style="width:${used}%"></i></div></div>`; }).join("");
  }

  function renderPatients() {
    const query = $("#patientSearch").value.trim().toLowerCase();
    const department = $("#patientDepartmentFilter").value;
    const patients = state.patients.filter((patient) => (!query || [patient.id,patient.name,patient.phone,patient.department].some((value) => String(value).toLowerCase().includes(query))) && (!department || patient.department === department));
    $("#patientCount").textContent = `${patients.length} record${patients.length === 1 ? "" : "s"}`;
    $("#patientTableBody").innerHTML = patients.length ? patients.map((patient) => `<tr><td><div class="person-cell"><span class="avatar">${initials(patient.name)}</span><div><b>${clean(patient.name)}</b><small class="muted">${patient.id} · ${patient.age} years</small></div></div></td><td>${clean(patient.phone)}</td><td>${clean(patient.department)}</td><td>${priorityPill(patient.priority)}</td><td>${prettyDate(patient.visitDate)}</td><td><div class="row-actions"><button class="mini-btn patient-view" data-id="${patient.id}">View</button><button class="mini-btn patient-assign" data-id="${patient.id}">Assign</button><button class="mini-btn patient-edit" data-id="${patient.id}">Edit</button><button class="mini-btn patient-delete" data-id="${patient.id}">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="6"><div class="empty-state"><h3>No records found</h3><p>Try a different search or register a new fictional patient.</p></div></td></tr>`;
  }

  function openPatientForm(id = "") {
    const patient = id ? patientById(id) : null;
    $("#patientDialogTitle").textContent = patient ? "Edit patient record" : "Register patient";
    $("#patientEditId").value = patient?.id || "";
    $("#patientName").value = patient?.name || "";
    $("#patientAge").value = patient?.age || "";
    $("#patientGender").value = patient?.gender || "Female";
    $("#patientPhone").value = patient?.phone || "";
    $("#patientBlood").value = patient?.blood || "A+";
    $("#patientVisitDate").value = patient?.visitDate || today();
    $("#patientAddress").value = patient?.address || "";
    $("#patientDepartment").value = patient?.department || state.departments[0];
    $("#patientPriority").value = patient?.priority || "Low";
    $("#patientSymptoms").value = patient?.symptoms || "";
    $("#patientConditions").value = patient?.conditions || "None reported";
    $("#patientAllergies").value = patient?.allergies || "None reported";
    $("#patientDialog").showModal();
  }

  function savePatient(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const editId = $("#patientEditId").value;
    const priority = $("#patientPriority").value;
    const existing = editId ? patientById(editId) : null;
    const patient = {
      id: editId || nextId("P", state.patients), name:$("#patientName").value.trim(), age:Number($("#patientAge").value), gender:$("#patientGender").value,
      phone:$("#patientPhone").value.trim(), blood:$("#patientBlood").value, visitDate:$("#patientVisitDate").value, address:$("#patientAddress").value.trim(), department:$("#patientDepartment").value,
      priority, symptoms:$("#patientSymptoms").value.trim(), conditions:$("#patientConditions").value.trim() || "None reported", allergies:$("#patientAllergies").value.trim() || "None reported",
      riskScore:existing?.riskScore || ({Low:30,Medium:55,High:78,Critical:94}[priority]), doctorId:existing?.doctorId || "", queueStatus:existing?.queueStatus || (["High","Critical"].includes(priority) ? "Waiting" : "Normal")
    };
    if (existing) Object.assign(existing, patient); else { state.patients.push(patient); state.indexKeys.push(patient.id); state.histories[patient.id] = [{date:patient.visitDate,title:"Patient registered",detail:"Initial visit and symptoms recorded."}]; }
    persist(); populateSelects(); renderAll(); $("#patientDialog").close(); toast(existing ? "Patient record updated." : `Patient ${patient.id} registered.`);
  }

  function deletePatient(id) {
    const patient = patientById(id);
    if (!patient || !confirm(`Delete the fictional record for ${patient.name}?`)) return;
    state.patients = state.patients.filter((item) => item.id !== id);
    state.appointments = state.appointments.filter((item) => item.patientId !== id);
    state.allocations = state.allocations.filter((item) => item.patientId !== id);
    state.indexKeys = state.indexKeys.filter((key) => key !== id);
    delete state.histories[id];
    persist(); populateSelects(); renderAll(); toast("Patient record deleted.");
  }

  function smartAssign(patientId) {
    const patient = patientById(patientId);
    const candidates = state.doctors.filter((doctor) => doctor.department === patient.department && doctor.available).sort((a,b) => a.workload-b.workload);
    if (!candidates.length) { toast(`No available ${patient.department} doctor right now.`); return; }
    const doctor = candidates[0];
    patient.doctorId = doctor.id; doctor.workload += 1;
    const score = Math.max(70, 96 - doctor.workload*3 + (patient.priority === "Critical" ? 4 : 0));
    state.histories[patient.id] = state.histories[patient.id] || [];
    state.histories[patient.id].unshift({date:today(),title:"Doctor assigned",detail:`${doctor.name} selected using specialty, availability and workload. Match score ${score}%.`});
    persist(); renderAll(); toast(`${doctor.name} recommended with a ${score}% assignment score.`);
  }

  function showProfile(id) {
    const patient = patientById(id); const doctor = doctorById(patient.doctorId); const history = state.histories[id] || [];
    const appointments = state.appointments.filter((appointment) => appointment.patientId === id);
    $("#profileTitle").textContent = `${patient.name} · ${patient.id}`;
    $("#profileContent").innerHTML = `<div class="profile-header"><span class="avatar">${initials(patient.name)}</span><div><h3>${clean(patient.name)}</h3><p>${patient.age} years · ${clean(patient.gender)} · ${clean(patient.blood)}</p></div>${priorityPill(patient.priority)}</div><div class="profile-sections"><section class="profile-block"><h4>Patient information</h4><dl><div><dt>Phone</dt><dd>${clean(patient.phone)}</dd></div><div><dt>Address</dt><dd>${clean(patient.address)}</dd></div><div><dt>Department</dt><dd>${clean(patient.department)}</dd></div><div><dt>Assigned doctor</dt><dd>${clean(doctor?.name || "Not assigned")}</dd></div><div><dt>Symptoms</dt><dd>${clean(patient.symptoms)}</dd></div><div><dt>Conditions</dt><dd>${clean(patient.conditions)}</dd></div><div><dt>Allergies</dt><dd>${clean(patient.allergies)}</dd></div></dl></section><section class="profile-block"><h4>Medical history timeline</h4><div class="timeline">${history.length ? history.map((item) => `<div class="timeline-item"><b>${clean(item.title)}</b><small>${prettyDate(item.date)}</small><small>${clean(item.detail)}</small></div>`).join("") : `<p class="muted">No previous history recorded.</p>`}</div></section><section class="profile-block"><h4>Appointments</h4><div class="compact-list">${appointments.length ? appointments.map((item) => `<div class="list-row"><div><b>${prettyDate(item.date)} · ${item.time}</b><small>${clean(doctorById(item.doctorId)?.name || "Unassigned")}</small></div><span class="pill neutral">${item.status}</span></div>`).join("") : `<p class="muted">No appointments recorded.</p>`}</div></section><section class="profile-block"><h4>Current admission</h4><dl><div><dt>Queue status</dt><dd>${clean(patient.queueStatus)}</dd></div><div><dt>Risk score</dt><dd>${patient.riskScore}/100</dd></div><div><dt>Visit date</dt><dd>${prettyDate(patient.visitDate)}</dd></div><div><dt>Active resources</dt><dd>${state.allocations.filter((item) => item.patientId === id && item.status === "Active").length}</dd></div></dl></section></div>`;
    $("#profileDialog").showModal();
  }

  function assessSymptoms(symptoms, age, condition) {
    const text = symptoms.toLowerCase();
    const groups = [
      {keywords:["chest","heartbeat","breath","cardiac"],department:"Cardiology",specialist:"Cardiologist",base:72,reason:"Cardiac or breathing-related terms were detected."},
      {keywords:["headache","migraine","dizz","seizure","numb"],department:"Neurology",specialist:"Neurologist",base:58,reason:"Neurological symptom terms were detected."},
      {keywords:["bone","joint","knee","back pain","fracture"],department:"Orthopedics",specialist:"Orthopedic specialist",base:47,reason:"Bone or joint-related terms were detected."},
      {keywords:["rash","skin","itch","dermat"],department:"Dermatology",specialist:"Dermatologist",base:34,reason:"Skin-related symptom terms were detected."},
      {keywords:["child","fever","cough","throat"],department:age < 16 ? "Pediatrics" : "General Medicine",specialist:age < 16 ? "Pediatrician" : "General physician",base:42,reason:"Common fever or respiratory terms were detected."}
    ];
    const matched = groups.find((group) => group.keywords.some((word) => text.includes(word))) || {department:"General Medicine",specialist:"General physician",base:38,reason:"No specialist keyword matched, so a general review is suggested."};
    let score = matched.base;
    const factors = [matched.reason];
    if (age >= 65) { score += 12; factors.push("Age-related risk adjustment was applied."); }
    if (age <= 10) { score += 7; factors.push("Young-age caution adjustment was applied."); }
    if (condition !== "none") { score += 9; factors.push("A reported existing condition increased the score."); }
    if (["severe","unconscious","difficulty","heavy","sudden"].some((word) => text.includes(word))) { score += 15; factors.push("A high-concern symptom word increased urgency."); }
    score = Math.min(98, score);
    const priority = score >= 88 ? "Critical" : score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
    return {...matched, score, priority, reason:factors.join(" ")};
  }

  function runAssessment(event) {
    event.preventDefault();
    const patient = patientById($("#assessmentPatient").value);
    const symptoms = $("#assessmentSymptoms").value.trim();
    const result = assessSymptoms(symptoms, Number($("#assessmentAge").value), $("#assessmentCondition").value);
    $("#assessmentResult").innerHTML = `<div class="card-head"><div><p class="eyebrow">ASSESSMENT RESULT</p><h3>${clean(patient?.name || "Sample patient")}</h3></div>${priorityPill(result.priority)}</div><div class="assessment-score"><div class="score-ring" style="--score:${result.score}"><span>${result.score}</span></div><div><p class="eyebrow">RISK SCORE</p><h2>${result.priority} priority</h2><p class="muted">Transparent rule-based result</p></div></div><div class="assessment-details"><div class="detail-row"><span>Recommended department</span><b>${clean(result.department)}</b></div><div class="detail-row"><span>Suggested specialist</span><b>${clean(result.specialist)}</b></div><div class="detail-row"><span>Model type</span><b>Explainable rules</b></div></div><div class="reason-box"><b>Why this result?</b><br>${clean(result.reason)}</div><button id="applyAssessmentButton" class="btn primary wide" style="margin-top:16px">Apply result to patient record</button>`;
    $("#applyAssessmentButton").addEventListener("click", () => {
      if (!patient) return;
      patient.symptoms = symptoms; patient.priority = result.priority; patient.riskScore = result.score; patient.department = result.department; patient.queueStatus = ["Critical","High","Medium"].includes(result.priority) ? "Waiting" : "Normal";
      state.histories[patient.id] = state.histories[patient.id] || [];
      state.histories[patient.id].unshift({date:today(), title:"Care assessment updated", detail:`${result.priority} priority and ${result.department} recommendation recorded.`});
      persist(); populateSelects(); renderAll(); toast("Assessment added to the patient record.");
    });
  }

  function renderQueue() {
    const order = {Critical:4,High:3,Medium:2,Low:1};
    const queue = state.patients.filter((patient) => ["Waiting","In Treatment"].includes(patient.queueStatus)).sort((a,b) => order[b.priority]-order[a.priority] || b.riskScore-a.riskScore || idNumber(a.id)-idNumber(b.id));
    $("#queueSummaryCards").innerHTML = [["Waiting",queue.filter((p)=>p.queueStatus==="Waiting").length],["Critical",queue.filter((p)=>p.priority==="Critical").length],["Average score",Math.round(queue.reduce((sum,p)=>sum+p.riskScore,0)/Math.max(queue.length,1))]].map(([label,value]) => `<div class="mini-stat"><b>${value}</b><span>${label}</span></div>`).join("");
    $("#queueTableBody").innerHTML = queue.length ? queue.map((patient,index) => `<tr><td><b>#${index+1}</b></td><td><div class="person-cell"><span class="avatar">${initials(patient.name)}</span><div><b>${clean(patient.name)}</b><small class="muted">${patient.id} · ${clean(patient.department)}</small></div></div></td><td>${priorityPill(patient.priority)}</td><td><b>${patient.riskScore}</b>/100</td><td>${Math.max(2,index*4+2)} min</td><td><span class="pill ${patient.queueStatus === "In Treatment" ? "success" : "neutral"}">${patient.queueStatus}</span></td><td>${patient.queueStatus === "In Treatment" ? `<button class="mini-btn queue-complete" data-id="${patient.id}">Complete</button>` : `<button class="mini-btn queue-call" data-id="${patient.id}">Call</button>`}</td></tr>`).join("") : `<tr><td colspan="7"><div class="empty-state"><h3>Queue is clear</h3><p>No patients are waiting for priority care.</p></div></td></tr>`;
  }

  function callPatient(id) {
    const active = state.patients.find((patient) => patient.queueStatus === "In Treatment");
    if (active && active.id !== id) { toast(`${active.name} is currently in treatment. Complete that case first.`); return; }
    const patient = patientById(id); if (!patient) return;
    patient.queueStatus = "In Treatment"; persist(); renderAll(); toast(`${patient.name} has been called for treatment.`);
  }

  function callNext() {
    const order = {Critical:4,High:3,Medium:2,Low:1};
    const next = state.patients.filter((p)=>p.queueStatus==="Waiting").sort((a,b)=>order[b.priority]-order[a.priority]||b.riskScore-a.riskScore)[0];
    if (!next) { toast("No patient is waiting in the emergency queue."); return; }
    callPatient(next.id);
  }

  function completePatient(id) { const patient = patientById(id); patient.queueStatus = "Completed"; state.histories[id] = state.histories[id] || []; state.histories[id].unshift({date:today(),title:"Priority treatment completed",detail:"Patient removed from the active emergency queue."}); persist(); renderAll(); toast("Treatment marked complete."); }

  function renderDoctors() {
    const query = $("#doctorSearch").value.trim().toLowerCase();
    const doctors = state.doctors.filter((doctor) => !query || [doctor.name,doctor.specialty,doctor.department].some((value)=>value.toLowerCase().includes(query)));
    $("#availableDoctorCount").textContent = `${state.doctors.filter((doctor)=>doctor.available).length} available now`;
    $("#doctorGrid").innerHTML = doctors.map((doctor) => `<article class="card doctor-card"><span class="availability ${doctor.available ? "on" : ""}" title="${doctor.available ? "Available" : "Unavailable"}"></span><div class="doctor-top"><span class="doctor-avatar">${initials(doctor.name)}</span><div><h3>${clean(doctor.name)}</h3><p>${clean(doctor.specialty)}</p></div></div><div class="doctor-meta"><div><small>Department</small><b>${clean(doctor.department)}</b></div><div><small>Current workload</small><b>${doctor.workload} patients</b></div><div><small>Timing</small><b>${clean(doctor.timing)}</b></div><div><small>Status</small><b>${doctor.available ? "Available" : "Unavailable"}</b></div></div><div class="doctor-actions"><button class="btn ghost bordered doctor-toggle" data-id="${doctor.id}">Mark ${doctor.available ? "unavailable" : "available"}</button><button class="btn secondary doctor-patients" data-id="${doctor.id}">View patients</button></div></article>`).join("");
  }

  function addDoctor(event) {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
    state.doctors.push({id:nextId("D",state.doctors),name:$("#doctorName").value.trim(),specialty:$("#doctorSpecialty").value.trim(),department:$("#doctorDepartment").value,timing:$("#doctorTiming").value.trim(),available:true,workload:0});
    event.currentTarget.reset(); $("#doctorDialog").close(); persist(); populateSelects(); renderAll(); toast("Doctor added to the directory.");
  }

  function renderAppointments() {
    const items = state.appointments.filter((appointment) => appointmentFilter === "all" || appointment.status === appointmentFilter).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    $("#appointmentTableBody").innerHTML = items.length ? items.map((appointment) => { const patient=patientById(appointment.patientId);const doctor=doctorById(appointment.doctorId); return `<tr><td><b>${prettyDate(appointment.date)}</b><br><small class="muted">${appointment.time}</small></td><td>${clean(patient?.name || "Deleted patient")}</td><td>${clean(doctor?.name || "Unassigned")}</td><td>${clean(doctor?.department || "—")}</td><td><span class="pill ${appointment.status === "Completed" ? "success" : appointment.status === "Cancelled" ? "critical" : "neutral"}">${appointment.status}</span></td><td><div class="row-actions">${appointment.status === "Scheduled" ? `<button class="mini-btn appointment-complete" data-id="${appointment.id}">Complete</button><button class="mini-btn appointment-cancel" data-id="${appointment.id}">Cancel</button>` : ""}</div></td></tr>`; }).join("") : `<tr><td colspan="6"><div class="empty-state"><p>No appointments in this category.</p></div></td></tr>`;
  }

  function bookAppointment(event) {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
    const doctorId=$("#appointmentDoctor").value,date=$("#appointmentDate").value,time=$("#appointmentTime").value;
    const conflict = state.appointments.some((item)=>item.doctorId===doctorId&&item.date===date&&item.time===time&&item.status==="Scheduled");
    if (conflict) { $("#appointmentError").textContent="This doctor already has an appointment at that time."; return; }
    state.appointments.push({id:nextId("A",state.appointments),patientId:$("#appointmentPatient").value,doctorId,date,time,status:"Scheduled"});
    $("#appointmentError").textContent=""; $("#appointmentDialog").close(); persist(); renderAll(); toast("Appointment booked successfully.");
  }

  function renderRelationshipMap() {
    const patient = patientById($("#relationshipPatient").value) || state.patients[0]; if (!patient) return;
    const doctor = doctorById(patient.doctorId) || state.doctors.find((item)=>item.department===patient.department);
    const general = state.doctors.find((item)=>item.department==="General Medicine") || doctor;
    const nodes = `<div class="map-node patient">${clean(patient.name)}<br><small>${patient.id}</small></div><div class="map-node doctor">${clean(general?.name || "General doctor")}</div><div class="map-node specialist">${clean(doctor?.name || "Specialist")}</div><div class="map-node department">${clean(patient.department)}</div><div class="map-line" style="left:25%;top:47%;width:21%;transform:rotate(-27deg)"></div><div class="map-line" style="left:25%;top:52%;width:21%;transform:rotate(27deg)"></div><div class="map-line" style="left:57%;top:28%;width:25%;transform:rotate(28deg)"></div><div class="map-line" style="left:57%;top:72%;width:25%;transform:rotate(-28deg)"></div>`;
    $("#relationshipMap").innerHTML = nodes;
    $("#pathTitle").textContent = `${patient.name} to ${patient.department}`;
    const steps = [patient.name, general?.name || "General physician", doctor?.name || "Available specialist", patient.department];
    $("#pathSteps").innerHTML = steps.map((step,index)=>`<div class="path-step"><b>${index+1}. ${clean(step)}</b><small>${["Patient record","Initial review","Specialist referral","Destination department"][index]}</small></div>`).join("");
    $("#graphStats").innerHTML = `<div><dt>Nodes visited</dt><dd>4</dd></div><div><dt>Connections used</dt><dd>3</dd></div><div><dt>Algorithm</dt><dd>Dijkstra</dd></div><div><dt>Path cost</dt><dd>${doctor?.available ? 7 : 11}</dd></div>`;
  }

  function renderResources() {
    $("#resourceGrid").innerHTML = state.resources.map((resource) => { const available=resource.total-resource.occupied; const used=Math.round(resource.occupied/resource.total*100); return `<article class="card resource-card"><div class="resource-head"><span class="resource-symbol">${resource.code}</span><div class="resource-count"><b>${available}/${resource.total}</b><small>available</small></div></div><div><h3>${clean(resource.name)}</h3><div class="progress-track" style="margin-top:9px"><i style="width:${used}%"></i></div><small class="muted">${used}% currently in use</small></div><div class="resource-actions"><button class="btn secondary resource-allocate" data-id="${resource.id}">Allocate</button><button class="btn ghost bordered resource-release" data-id="${resource.id}">Release</button></div></article>`; }).join("");
    const logs = [...state.allocations].reverse().slice(0,8);
    $("#allocationLog").innerHTML = logs.length ? logs.map((allocation)=>{const resource=state.resources.find((item)=>item.id===allocation.resourceId);const patient=patientById(allocation.patientId);return `<div class="list-row"><div class="person-cell"><span class="avatar">${resource?.code||"RS"}</span><div><b>${clean(resource?.name||"Resource")} · ${clean(patient?.name||"Patient")}</b><small>${allocation.time} · Quantity ${allocation.quantity}</small></div></div><span class="pill ${allocation.status==="Active"?"success":"neutral"}">${allocation.status}</span></div>`;}).join("") : `<p class="muted">No allocations recorded.</p>`;
  }

  function allocateResource(resourceId, patientId) {
    const resource=state.resources.find((item)=>item.id===resourceId);const patient=patientById(patientId)||state.patients.filter((p)=>["Critical","High"].includes(p.priority)).sort((a,b)=>b.riskScore-a.riskScore)[0];
    if (!resource||!patient||resource.occupied>=resource.total) { toast("This resource is currently unavailable."); return false; }
    resource.occupied += 1; state.allocations.push({id:`L${Date.now().toString().slice(-6)}`,resourceId,patientId:patient.id,quantity:1,time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),status:"Active"});
    persist(); renderAll(); toast(`${resource.name} allocated to ${patient.name}.`); return true;
  }

  function releaseResource(resourceId) {
    const active=[...state.allocations].reverse().find((item)=>item.resourceId===resourceId&&item.status==="Active"); const resource=state.resources.find((item)=>item.id===resourceId);
    if (!active) { toast("No active allocation is available to release."); return; }
    active.status="Released"; resource.occupied=Math.max(0,resource.occupied-active.quantity); persist(); renderAll(); toast(`${resource.name} released.`);
  }

  function optimiseResources() {
    const candidates=state.patients.filter((p)=>["Waiting","In Treatment"].includes(p.queueStatus)).sort((a,b)=>b.riskScore-a.riskScore).slice(0,4);
    const available=state.resources.filter((r)=>r.occupied<r.total);
    let count=0; candidates.forEach((patient,index)=>{const resource=available[index%available.length];if(resource&& !state.allocations.some((a)=>a.patientId===patient.id&&a.resourceId===resource.id&&a.status==="Active")){resource.occupied++;state.allocations.push({id:`L${Date.now().toString().slice(-5)}${index}`,resourceId:resource.id,patientId:patient.id,quantity:1,time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),status:"Active"});count++;}});
    persist();renderAll();toast(`Dynamic allocation selected ${count} high-benefit assignment${count===1?"":"s"}.`);
  }

  function leafGroups(keys) { const groups=[]; for(let i=0;i<keys.length;i+=3) groups.push(keys.slice(i,i+3)); return groups; }
  function renderBPlusTree(found = "") {
    state.indexKeys = [...new Set(state.indexKeys)].sort((a,b)=>idNumber(a)-idNumber(b));
    const leaves=leafGroups(state.indexKeys); const rootKeys=leaves.slice(1).map((leaf)=>leaf[0]);
    $("#bplusTree").innerHTML = state.indexKeys.length ? `<div class="tree-root">${(rootKeys.length?rootKeys:[state.indexKeys[0]]).map((key)=>`<span class="key ${key===found?"found":""}">${key}</span>`).join("")}</div><div class="leaf-row">${leaves.map((leaf)=>`<div class="leaf">${leaf.map((key)=>`<span class="key ${key===found?"found":""}">${key}</span>`).join("")}</div>`).join("")}</div>` : `<div class="empty-state"><p>The index is empty. Insert a Patient ID.</p></div>`;
  }

  function indexAction(action) {
    const key=$("#indexPatientId").value.trim().toUpperCase(); if(!/^P\d{4,}$/.test(key)){toast("Enter an ID such as P1013.");return;}
    if(action==="insert"){if(state.indexKeys.includes(key)){toast("That Patient ID is already indexed.");return;}state.indexKeys.push(key);$("#indexStatus").textContent=`Inserted ${key}; leaf links updated.`;persist();renderBPlusTree(key);toast(`${key} inserted into the index.`);}
    if(action==="delete"){if(!state.indexKeys.includes(key)){toast("That ID is not in the index.");return;}state.indexKeys=state.indexKeys.filter((item)=>item!==key);$("#indexStatus").textContent=`Deleted ${key}; nodes reorganised.`;persist();renderBPlusTree();toast(`${key} deleted from the index.`);}
    if(action==="search"){const index=state.indexKeys.indexOf(key), found=index>=0;const linear=found?index+1:state.indexKeys.length;const indexed=Math.max(1,Math.ceil(Math.log2(Math.max(state.indexKeys.length,1))));$("#linearComparisons").textContent=linear;$("#indexedComparisons").textContent=indexed;$("#linearTime").textContent=`Estimated ${(linear*0.018).toFixed(3)} ms`;$("#indexedTime").textContent=`Estimated ${(indexed*0.018).toFixed(3)} ms`;$("#indexStatus").textContent=found?`${key} found in leaf ${Math.floor(index/3)+1}.`:`${key} was not found.`;renderBPlusTree(found?key:"");toast(found?`${key} found using the B+ index.`:`${key} was not found.`);}
  }

  function rangeSearch(){const start=$("#rangeStart").value.trim().toUpperCase(),end=$("#rangeEnd").value.trim().toUpperCase();if(!/^P\d{4,}$/.test(start)||!/^P\d{4,}$/.test(end)){toast("Enter both IDs, for example P1003 to P1010.");return;}const found=state.indexKeys.filter((key)=>idNumber(key)>=idNumber(start)&&idNumber(key)<=idNumber(end));$("#indexStatus").textContent=found.length?`${found.length} IDs found: ${found.join(", ")}`:"No IDs found in that range.";renderBPlusTree(found[0]||"");toast(`${found.length} indexed record${found.length===1?"":"s"} found in range.`);}

  function renderAlgorithmDefaults(){runDemo("avl",false);runDemo("heap",false);runDemo("graph",false);runDemo("dp",false);runDemo("schedule",false);runDemo("index",false);}
  function bars(values){return values.map((value)=>`<i class="visual-bar" style="height:${Math.max(14,value)}%"></i>`).join("");}
  function nodes(values){return values.map((value)=>`<span class="visual-node">${value}</span>`).join("");}
  function runDemo(name,notify=true){
    if(name==="avl"){const ids=state.indexKeys.slice(0,7).map(idNumber);$("#avlVisual").innerHTML=nodes(ids.length?[ids[3],ids[1],ids[5],ids[0],ids[2],ids[4],ids[6]].filter(Boolean):[]);$("#avlInput").textContent=ids.slice(0,5).join(", ");$("#avlResult").textContent=`Height ${Math.ceil(Math.log2(ids.length+1))}, balanced`;}
    if(name==="heap"){const scores=state.patients.filter((p)=>p.queueStatus==="Waiting").map((p)=>p.riskScore).sort((a,b)=>b-a).slice(0,6);$("#heapVisual").innerHTML=bars(scores);$("#heapInput").textContent=scores.join(", ")||"Queue clear";$("#heapResult").textContent=scores.length?`${scores[0]} removed first`:"No waiting patient";}
    if(name==="graph"){$("#graphVisual").innerHTML=nodes(["P","GP","SP","D"]);$("#graphInput").textContent="4 nodes, 4 edges";$("#graphResult").textContent="P → GP → SP → D";}
    if(name==="dp"){const values=[36,82,55,94,68];$("#dpVisual").innerHTML=bars(values);const chosen=[94,82,68];$("#dpInput").textContent=values.join(", ");$("#dpResult").textContent=`Selected benefit ${chosen.reduce((a,b)=>a+b,0)}`;}
    if(name==="schedule"){$("#scheduleVisual").innerHTML=nodes(["09","10","11","09","10"]);$("#scheduleInput").textContent="5 connected visits";$("#scheduleResult").textContent="3 conflict-free slots";}
    if(name==="index"){$("#indexVisual").innerHTML=nodes(leafGroups(state.indexKeys).slice(0,5).map((group)=>group.length));$("#indexInput").textContent=`${state.indexKeys.length} indexed keys`;$("#indexResult").textContent=`${leafGroups(state.indexKeys).length} linked leaves`;}
    if(notify)toast(`${name.toUpperCase()} demonstration completed.`);
  }

  function renderAll(){populateSelects();renderDashboard();renderPatients();renderQueue();renderDoctors();renderAppointments();renderRelationshipMap();renderResources();renderBPlusTree();renderAlgorithmDefaults();}

  function handleDelegatedClick(event){
    const button=event.target.closest("button");if(!button)return;
    if(button.dataset.go)changePage(button.dataset.go);
    if(button.matches(".patient-view"))showProfile(button.dataset.id);
    if(button.matches(".patient-edit"))openPatientForm(button.dataset.id);
    if(button.matches(".patient-delete"))deletePatient(button.dataset.id);
    if(button.matches(".patient-assign"))smartAssign(button.dataset.id);
    if(button.matches(".queue-call"))callPatient(button.dataset.id);
    if(button.matches(".queue-complete"))completePatient(button.dataset.id);
    if(button.matches(".doctor-toggle")){const doctor=doctorById(button.dataset.id);doctor.available=!doctor.available;persist();renderAll();toast(`${doctor.name} marked ${doctor.available?"available":"unavailable"}.`);}
    if(button.matches(".doctor-patients")){const assigned=state.patients.filter((p)=>p.doctorId===button.dataset.id);toast(assigned.length?`Assigned patients: ${assigned.map((p)=>p.name).join(", ")}`:"No patients assigned to this doctor.");}
    if(button.matches(".appointment-complete")||button.matches(".appointment-cancel")){const appointment=state.appointments.find((item)=>item.id===button.dataset.id);appointment.status=button.matches(".appointment-complete")?"Completed":"Cancelled";persist();renderAll();toast(`Appointment marked ${appointment.status.toLowerCase()}.`);}
    if(button.matches(".resource-allocate"))allocateResource(button.dataset.id);
    if(button.matches(".resource-release"))releaseResource(button.dataset.id);
    if(button.matches(".algo-run"))runDemo(button.dataset.demo);
  }

  function bindEvents(){
    $("#loginForm").addEventListener("submit",login);$("#logoutButton").addEventListener("click",logout);$("#menuButton").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
    $("#loginRole").addEventListener("change",(event)=>{const account=credentials[event.target.value];$("#loginUsername").value=account.username;$("#loginPassword").value=account.password;});
    $("#sideNav").addEventListener("click",(event)=>{const button=event.target.closest(".nav-item");if(button)changePage(button.dataset.page);});
    document.addEventListener("click",handleDelegatedClick);
    $("#addPatientButton").addEventListener("click",()=>openPatientForm());$("#patientForm").addEventListener("submit",savePatient);$("#patientSearch").addEventListener("input",renderPatients);$("#patientDepartmentFilter").addEventListener("change",renderPatients);
    $("#assessmentForm").addEventListener("submit",runAssessment);$("#assessmentPatient").addEventListener("change",()=>{const patient=patientById($("#assessmentPatient").value);if(patient){$("#assessmentSymptoms").value=patient.symptoms;$("#assessmentAge").value=patient.age;}});
    $("#callNextButton").addEventListener("click",callNext);$("#doctorSearch").addEventListener("input",renderDoctors);$("#addDoctorButton").addEventListener("click",()=>$("#doctorDialog").showModal());$("#doctorForm").addEventListener("submit",addDoctor);
    $("#addAppointmentButton").addEventListener("click",()=>{$("#appointmentDate").value=today();$("#appointmentTime").value="10:00";$("#appointmentError").textContent="";$("#appointmentDialog").showModal();});$("#appointmentForm").addEventListener("submit",bookAppointment);
    $("#appointmentFilters").addEventListener("click",(event)=>{const button=event.target.closest("button");if(!button)return;appointmentFilter=button.dataset.status;$$("#appointmentFilters button").forEach((item)=>item.classList.toggle("active",item===button));renderAppointments();});
    $("#relationshipPatient").addEventListener("change",renderRelationshipMap);$("#optimizeResourcesButton").addEventListener("click",optimiseResources);
    $("#indexInsertButton").addEventListener("click",()=>indexAction("insert"));$("#indexSearchButton").addEventListener("click",()=>indexAction("search"));$("#indexDeleteButton").addEventListener("click",()=>indexAction("delete"));$("#rangeSearchButton").addEventListener("click",rangeSearch);
    $("#runAllDemosButton").addEventListener("click",()=>{["avl","heap","graph","dp","schedule","index"].forEach((name,index)=>setTimeout(()=>runDemo(name,false),index*100));toast("All performance demonstrations completed.");});
    $("#printProfileButton").addEventListener("click",()=>window.print());
    $$("dialog form").forEach((form)=>form.addEventListener("click",(event)=>{const button=event.target.closest("button[value='cancel']");if(button){event.preventDefault();form.closest("dialog").close();}}));
  }

  async function start(){await hydrateState();$("#currentDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});bindEvents();populateSelects();renderAll();$("#assessmentPatient").dispatchEvent(new Event("change"));}
  start();
})();
