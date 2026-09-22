/** Clé exclusivement côté serveur ; trafic prévisionnel à l'heure de départ demandée. */
export async function estimateRoute(input, apiKey, request = fetch) {
 const fail=(message,status=400)=>{const error=new Error(message);error.status=status;throw error;};
 if(!apiKey)fail('Google Maps non configuré. Saisissez une durée manuelle ou configurez la clé API Routes côté serveur.',503);
 if(!input||typeof input.origin!=='string'||typeof input.destination!=='string'||!input.origin.trim()||!input.destination.trim()||input.origin.length>500||input.destination.length>500)fail('Deux adresses valides sont nécessaires.');
 const at=Date.parse(input.departureTime);
 if(!Number.isFinite(at)||at<Date.now())fail('Une heure de départ future est nécessaire pour le trafic.');
 const response=await request('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':apiKey,'X-Goog-FieldMask':'routes.duration,routes.distanceMeters'},body:JSON.stringify({origin:{address:input.origin.trim()},destination:{address:input.destination.trim()},travelMode:'DRIVE',routingPreference:'TRAFFIC_AWARE_OPTIMAL',departureTime:new Date(at).toISOString(),languageCode:'fr'}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)fail('Google Maps ne peut pas calculer ce trajet. Vérifiez la configuration, les adresses et la date.',502);
 const data=await response.json();const route=data.routes?.[0];const seconds=typeof route?.duration==='string'&&/^\d+(\.\d+)?s$/.test(route.duration)?Number(route.duration.slice(0,-1)):NaN;
 if(!Number.isFinite(seconds))fail('Aucun trajet routier trouvé.',422);
 return {minutes:Math.ceil(seconds/60),distanceMeters:route.distanceMeters,source:'Google Maps',departureTime:new Date(at).toISOString()};
}
