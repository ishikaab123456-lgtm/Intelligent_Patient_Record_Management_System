(function () {
  const iso = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  window.MEDIRECORD_DEFAULT_STATE = {
    departments: ["Cardiology", "Neurology", "Orthopedics", "General Medicine", "Pediatrics", "Dermatology"],
    patients: [
      {id:"P1001",name:"Aarav Mehta",age:58,gender:"Male",phone:"9876501001",blood:"B+",address:"Greater Noida",symptoms:"Chest discomfort and shortness of breath",conditions:"Hypertension",allergies:"None reported",department:"Cardiology",priority:"Critical",riskScore:94,visitDate:iso(0),doctorId:"D101",queueStatus:"Waiting"},
      {id:"P1002",name:"Meera Sharma",age:34,gender:"Female",phone:"9876501002",blood:"O+",address:"Noida",symptoms:"Recurring migraine and dizziness",conditions:"Migraine",allergies:"Penicillin",department:"Neurology",priority:"High",riskScore:81,visitDate:iso(0),doctorId:"D102",queueStatus:"Waiting"},
      {id:"P1003",name:"Kabir Verma",age:26,gender:"Male",phone:"9876501003",blood:"A+",address:"Ghaziabad",symptoms:"Knee pain after sports activity",conditions:"None reported",allergies:"None reported",department:"Orthopedics",priority:"Medium",riskScore:55,visitDate:iso(0),doctorId:"D103",queueStatus:"Waiting"},
      {id:"P1004",name:"Saanvi Gupta",age:9,gender:"Female",phone:"9876501004",blood:"AB+",address:"Greater Noida",symptoms:"Fever and cough",conditions:"None reported",allergies:"Dust",department:"Pediatrics",priority:"Medium",riskScore:62,visitDate:iso(0),doctorId:"D105",queueStatus:"Waiting"},
      {id:"P1005",name:"Vihaan Singh",age:42,gender:"Male",phone:"9876501005",blood:"O-",address:"Delhi",symptoms:"Skin irritation and itching",conditions:"Seasonal allergy",allergies:"Pollen",department:"Dermatology",priority:"Low",riskScore:31,visitDate:iso(-1),doctorId:"D106",queueStatus:"Normal"},
      {id:"P1006",name:"Ananya Joshi",age:67,gender:"Female",phone:"9876501006",blood:"A-",address:"Noida",symptoms:"Weakness and high blood sugar reading",conditions:"Diabetes",allergies:"None reported",department:"General Medicine",priority:"High",riskScore:78,visitDate:iso(0),doctorId:"D104",queueStatus:"Waiting"},
      {id:"P1007",name:"Arjun Malhotra",age:31,gender:"Male",phone:"9876501007",blood:"B-",address:"Ghaziabad",symptoms:"Lower back pain",conditions:"None reported",allergies:"None reported",department:"Orthopedics",priority:"Low",riskScore:38,visitDate:iso(-2),doctorId:"D103",queueStatus:"Normal"},
      {id:"P1008",name:"Diya Kapoor",age:23,gender:"Female",phone:"9876501008",blood:"B+",address:"Noida",symptoms:"Persistent headache",conditions:"None reported",allergies:"None reported",department:"Neurology",priority:"Medium",riskScore:52,visitDate:iso(1),doctorId:"D102",queueStatus:"Scheduled"},
      {id:"P1009",name:"Reyansh Yadav",age:12,gender:"Male",phone:"9876501009",blood:"O+",address:"Greater Noida",symptoms:"Sore throat and mild fever",conditions:"None reported",allergies:"None reported",department:"Pediatrics",priority:"Low",riskScore:34,visitDate:iso(1),doctorId:"D105",queueStatus:"Scheduled"},
      {id:"P1010",name:"Ira Chawla",age:49,gender:"Female",phone:"9876501010",blood:"AB-",address:"Delhi",symptoms:"Irregular heartbeat sensation",conditions:"High cholesterol",allergies:"None reported",department:"Cardiology",priority:"High",riskScore:84,visitDate:iso(0),doctorId:"D107",queueStatus:"Waiting"},
      {id:"P1011",name:"Advik Bansal",age:37,gender:"Male",phone:"9876501011",blood:"A+",address:"Hapur",symptoms:"Stomach discomfort and tiredness",conditions:"None reported",allergies:"None reported",department:"General Medicine",priority:"Medium",riskScore:48,visitDate:iso(2),doctorId:"D104",queueStatus:"Scheduled"},
      {id:"P1012",name:"Myra Saxena",age:29,gender:"Female",phone:"9876501012",blood:"O+",address:"Bulandshahr",symptoms:"Dry skin rash",conditions:"Atopic dermatitis",allergies:"Fragrance",department:"Dermatology",priority:"Low",riskScore:29,visitDate:iso(2),doctorId:"D106",queueStatus:"Scheduled"}
    ],
    doctors: [
      {id:"D101",name:"Dr. Rohan Sharma",specialty:"Interventional Cardiologist",department:"Cardiology",timing:"09:00–14:00",available:true,workload:3},
      {id:"D102",name:"Dr. Nisha Rao",specialty:"Neurologist",department:"Neurology",timing:"10:00–16:00",available:true,workload:2},
      {id:"D103",name:"Dr. Vikram Sethi",specialty:"Orthopedic Surgeon",department:"Orthopedics",timing:"09:30–15:30",available:false,workload:4},
      {id:"D104",name:"Dr. Priya Nair",specialty:"General Physician",department:"General Medicine",timing:"08:00–14:00",available:true,workload:2},
      {id:"D105",name:"Dr. Amit Khanna",specialty:"Pediatrician",department:"Pediatrics",timing:"11:00–17:00",available:true,workload:2},
      {id:"D106",name:"Dr. Sara Qureshi",specialty:"Dermatologist",department:"Dermatology",timing:"10:00–15:00",available:true,workload:2},
      {id:"D107",name:"Dr. Neel Arora",specialty:"Cardiologist",department:"Cardiology",timing:"14:00–19:00",available:false,workload:3}
    ],
    appointments: [
      {id:"A201",patientId:"P1001",doctorId:"D101",date:iso(0),time:"09:30",status:"Scheduled"},
      {id:"A202",patientId:"P1002",doctorId:"D102",date:iso(0),time:"10:15",status:"Scheduled"},
      {id:"A203",patientId:"P1004",doctorId:"D105",date:iso(0),time:"11:30",status:"Scheduled"},
      {id:"A204",patientId:"P1006",doctorId:"D104",date:iso(0),time:"12:00",status:"Scheduled"},
      {id:"A205",patientId:"P1008",doctorId:"D102",date:iso(1),time:"11:00",status:"Scheduled"},
      {id:"A206",patientId:"P1005",doctorId:"D106",date:iso(-1),time:"13:30",status:"Completed"},
      {id:"A207",patientId:"P1007",doctorId:"D103",date:iso(-2),time:"10:45",status:"Completed"}
    ],
    resources: [
      {id:"R1",name:"General beds",code:"BED",total:80,occupied:57},
      {id:"R2",name:"ICU beds",code:"ICU",total:18,occupied:14},
      {id:"R3",name:"Ventilators",code:"VEN",total:12,occupied:8},
      {id:"R4",name:"Operation rooms",code:"OT",total:7,occupied:4},
      {id:"R5",name:"Diagnostic units",code:"DX",total:15,occupied:9},
      {id:"R6",name:"Wheelchairs",code:"WC",total:25,occupied:11}
    ],
    allocations: [
      {id:"L301",resourceId:"R2",patientId:"P1001",quantity:1,time:"09:12",status:"Active"},
      {id:"L302",resourceId:"R3",patientId:"P1001",quantity:1,time:"09:14",status:"Active"},
      {id:"L303",resourceId:"R1",patientId:"P1006",quantity:1,time:"08:50",status:"Active"}
    ],
    histories: {
      P1001:[{date:iso(0),title:"Emergency assessment",detail:"High-priority cardiology review requested."},{date:iso(-190),title:"Routine consultation",detail:"Blood pressure monitoring advised."}],
      P1002:[{date:iso(0),title:"Neurology consultation",detail:"Symptoms recorded for specialist review."},{date:iso(-80),title:"Previous visit",detail:"Recurring headache history added."}],
      P1006:[{date:iso(0),title:"General medicine review",detail:"Existing condition considered during prioritisation."}]
    },
    indexKeys:["P1001","P1002","P1003","P1004","P1005","P1006","P1007","P1008","P1009","P1010","P1011","P1012"]
  };
})();
