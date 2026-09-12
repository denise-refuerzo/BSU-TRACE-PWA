import Swal from 'sweetalert2';
import {fetchWithAuth} from '../../../api';
export async function resourceApi(path, method = 'GET', body) {
  const response = await fetchWithAuth(`/api/resources/${path}`, {method, ...(body ? {body:JSON.stringify(body)} : {})});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}
export async function confirmResourceAction(title, text) {
  const result = await Swal.fire({icon:'question', title, text, showCancelButton:true, confirmButtonText:'Confirm', confirmButtonColor:'#991b1b', reverseButtons:true});
  return result.isConfirmed;
}
export const resourceSuccess = message => Swal.fire({icon:'success',title:'Saved successfully',text:message,confirmButtonColor:'#991b1b'});
export const resourceError = error => Swal.fire({icon:'error',title:'Action could not be completed',text:error.message,confirmButtonColor:'#991b1b'});
