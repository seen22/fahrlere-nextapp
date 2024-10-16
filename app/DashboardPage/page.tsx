'use client'
import jsPDF from 'jspdf';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Sidebarmenu from '../Sidebarmenu/page';

export default function DashboardPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);

  const navigateTo = (path: string) => {
    router.push(`${path}?id=${studentId}`);
  };
  const handleDownload = async () => {
    // Rufe die Funktion auf, um die neuesten Daten abzurufen und das PDF zu generieren
    await fetchFromFuseki();
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setStudentId(id);
      console.log('Extracted ID from URL:', id);  
    } else {
      console.error('No ID found in URL');
    }
  }, []);



  const fetchFromFuseki = async () => {

    if (!studentId) {
      console.error('No student ID found.');
      return;
  }
  
  
    const latestDataQuery = `
      PREFIX fahrl: <https://github.com/seen22/fahrlehre-nextapp/vocabulary.rdf#>
      PREFIX schema: <http://schema.org/>
          PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
          PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
          PREFIX owl: <http://www.w3.org/2002/07/owl#>

      SELECT ?subject ?predicate ?object
      WHERE {
        ?subject ?predicate ?object .
        FILTER(?subject = <https://github.com/seen22/fahrlehre-nextapp/formEntry-${studentId}>)
      }
      ORDER BY DESC(?timestamp)
    `; 
  
    try {
      // Fetch RDF data from Fuseki
      const response = await fetch('http://localhost:3030/FahrlehrerApp/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Correct content type for SPARQL queries
          'Accept': 'application/sparql-results+json', // Expecting SPARQL results in JSON
        },
        body: `query=${encodeURIComponent(latestDataQuery)}`, // Encode query
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch data from Fuseki: ${response.statusText}`);
      }
  
      // Get the response as JSON
      const rdfData = await response.json();
      console.log('Fetched RDF data:', rdfData);
  
      if (rdfData.results.bindings.length > 0) {
        console.log('Bindings:', rdfData.results.bindings); // Überprüfe die Bindings
  
          //convert JSON to Dictionary
        const finalDictionary = convertJsonToDict(rdfData);
        console.log('Finales Dictionary:', finalDictionary)
  
        convertDictToPdf(finalDictionary);
      }
      else {
          console.log('No data available for download');
      }
  
    } catch (error) {
      console.error('Error fetching RDF data:', error);
    }
  };  
   // Funktion zur Umwandlung von JSON in ein Dictionary
   const convertJsonToDict = (retrievedDictionary: { [x: string]: any }) => {
    const resultsDictionary = retrievedDictionary['results'];
    const bindings = resultsDictionary['bindings'];
    const newFinalDictionary: { [key: string]: string } = {}; // Definiere das Dictionary
  
    bindings.forEach((bind: { subject: any; predicate: { value: string }; object: { value: string } }) => {
      // Überprüfe und extrahiere den Wert aus dem Subject
      const subjectValue = bind.subject?.value || 'No Subject';
      const predicateValue = bind.predicate?.value || 'No Predicate'; // Prädikatwert
      const objectValue = bind.object?.value || 'No Object'; // Objektwert
  
      console.log('Subject:', subjectValue);
      console.log('Predicate:', predicateValue);
      console.log('Object:', objectValue);
  
      // Letzten Teil der Predicate-URI extrahieren
      const predicateKey = predicateValue.split('/').pop() || 'predicate';
  
      // Falls Predicate und Object vorhanden sind, zum Dictionary hinzufügen
      if (predicateKey && objectValue) {
        newFinalDictionary[predicateKey] = objectValue; // Prädikat als Schlüssel, Objekt als Wert
      }
    });
  
    console.log('Finales Dictionary:', newFinalDictionary);
    return newFinalDictionary; // Rückgabe des finalen Dictionarys
  };
  
  
  const convertDictToPdf = (dictionary: { [key: string]: string }) => {
  
  const doc = new jsPDF();
  
  // Set a main title for the PDF
  doc.setFontSize(20);
  doc.text("GOLD Fahrschule", 65, 20);
  
  // Subtitle or additional information
  // doc.setFontSize(14);
  // doc.text("Fahrschule Datenübersicht", 10, 20);
  
  let y = 40; // Starting y position for content
  doc.setFontSize(12);
  

  const studentDataKeys = ['fahrl:hasFirstName', 'fahrl:hasLastName', 'fahrl:hasDateOfBirth', 'fahrl:hasEyewear']; 
  const sonderfahrtKeys = ['fahrl:CountryRoadDrive', 'fahrl:Highway','fahrl:NightDrive'];
  const vorpruefungsKeys = ['fahrl:stop', 'fahrl:rightTurn', 'fahrl:multiLaneRightTurn', 'fahrl:railwayCrossing', 'fahrl:leftTurn', 'fahrl:multiLaneLeftTurn', 'fahrl:gearSelection', 'fahrl:bikeLane', 'fahrl:bikeOvertake', 'fahrl:entrance', 'fahrl:speedAdjustment']; // Keys that belong to "Users Page"
  const UebungsfahrtKeys = [
    'fahrl:BrakingExercises',
    'fahrl:GearShiftingExercises',
    'fahrl:SpeedAdjustment',
    'fahrl:RoadUsage',
    'fahrl:LaneChange',
    'fahrl:Turning',
    'fahrl:RightBeforeLeft',
    'fahrl:PriorityRoadSigns',
    'fahrl:PedestrianCrossings',
    'fahrl:Roundabout',
    'fahrl:RailwayCrossing',
    'fahrl:Reversing',
    'fahrl:Uturn',
    'fahrl:EmergencyBraking',
    'fahrl:ParallelParking',
    'fahrl:PerpendicularParking'
  ];
  
  
  

  const studentData: { [key: string]: string } = {};
  const Uebungsfahrtdata: { [key: string]: string } = {};
  const vorpruefungsdata: {[key:string]: string} = {};
  const sonderfahrtdata: {[key:string]: string} = {};
  
  // Split dictionary data into categories
  for (const [key, value] of Object.entries(dictionary)) {
    if (studentDataKeys.includes(key)) {
      studentData[key] = value;
    } else if (vorpruefungsKeys.includes(key)) {
      vorpruefungsdata[key] = value;
    }else if (UebungsfahrtKeys.includes(key)) {
      Uebungsfahrtdata[key] = value;
    }else if (sonderfahrtKeys.includes(key)){
      sonderfahrtdata[key]= value;
    }
  }

  if (Object.keys(studentData).length > 0) {
    doc.setFontSize(14);
    doc.text("Schülerdaten:", 10, y);
    y += 10;
    doc.setFontSize(12);
  
    for (const [key, value] of Object.entries(studentData)) {
      doc.text(`${key}: ${value}`, 10, y);
      y += 10;
  
      if (y > 280) { // Page break if necessary
        doc.addPage();
        y = 10;
      }
    }
  }
  
  
  if (Object.keys(Uebungsfahrtdata).length > 0) {
    y += 10; 
    doc.setFontSize(14);
    doc.text("Übungsfahrt:", 10, y);
    y += 10;
    doc.setFontSize(12);
  
    for (const [key, value] of Object.entries(Uebungsfahrtdata)) {
      doc.text(`${key}: ${value}`, 10, y);
      y += 10;
  
      if (y > 280) { // Page break if necessary
        doc.addPage();
        y = 10;
      }
    }
  }

  if (Object.keys(sonderfahrtdata).length > 0) {
    y += 10; 
    doc.setFontSize(14);
    doc.text("Sonderfahrt:", 10, y);
    y += 10;
    doc.setFontSize(12);
  
    for (const [key, value] of Object.entries(sonderfahrtdata)) {
      doc.text(`${key}: ${value}`, 10, y);
      y += 10;
  
      if (y > 280) { 
        doc.addPage();
        y = 10;
      }
    }
  }

  if (Object.keys(vorpruefungsdata).length > 0) {
    y += 10; // Add some spacing before the next section
    doc.setFontSize(14); 
    doc.text("Vorprüfung:", 10, y);
    y += 10;
    doc.setFontSize(12);
  
    for (const [key, value] of Object.entries(vorpruefungsdata)) {
      doc.text(`${key}: ${value}`, 10, y);
      y += 10;
  
      if (y > 280) { // Page break if necessary
        doc.addPage();
        y = 10;
      }
    }
  }
  
  // Save the PDF file
  doc.save('fahrschule_daten.pdf');
  };



  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900">
      <h1 className="text-4xl font-bold text-white mb-10">Fahrlehrer App</h1>
      
      <div className="space-y-6 w-full max-w-xs">

        <button
          onClick={() => navigateTo('/uebungsfahrt')}
          className="w-full bg-gray-800 text-white p-4 rounded-md hover:bg-gray-700 transition"
        >
         Übungsfahrt
        </button>
        <button
          onClick={() => navigateTo('/sonderfahrt')}
          className="w-full bg-gray-800 text-white p-4 rounded-md hover:bg-gray-700 transition"
        >
          Sonderfahrt
        </button>
        <button
          onClick={() => navigateTo('/vorpruefung')}
          className="w-full bg-gray-800 text-white p-4 rounded-md hover:bg-gray-700 transition"
        >
         Vorprüfung
        </button>
        <button
        onClick={handleDownload}
        className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
      >
        Download PDF
      </button>
      <Sidebarmenu></Sidebarmenu>
      </div>
    </div>
  );
}

