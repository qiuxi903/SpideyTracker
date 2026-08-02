	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
		  let data = JSON.parse(xhttp.responseText);
		  let country_value = data.CountryIsoCode;
		   // Preserve all query parameters
        const queryString = window.location.search || '';

        function redirect(url) {
            window.location.href = url + queryString;
        }
		if (country_value && !window.location.href.includes('?country=')) {

		  switch(country_value.toLowerCase()){
				case 'us':
				 redirect('https://spideytracker.com/');
				  break;
				case 'sg':
				 redirect('https://spideytracker.net/intl/sg');
				  break;
				case 'tw':
				 redirect('https://spideytracker.net/intl/tw');
				  break;
				case 'my':
				 redirect('https://spideytracker.net/intl/my');
				  break;
				case 'id':
				 redirect('https://spideytracker.net/intl/id');
				  break;
				case 'es':
				 redirect('https://spideytracker.net/intl/es');
				  break;
				case 'gb':
				 redirect('https://spideytracker.net/intl/uk');
				  break;
				case 'ie':
				 redirect('https://spideytracker.net/intl/uk');
				  break;
				case 'nl':
				 redirect('https://spideytracker.net/intl/nl');
				  break;
				case 'be':
				 redirect('https://spideytracker.net/intl/benl/');
				  break;
				case 'it':
				 redirect('https://spideytracker.net/intl/it');
				  break;
				case 'ca':
				 redirect('https://spideytracker.net/intl/caen/');
				  break;
				case 'kr':
				 redirect('https://spideytracker.net/intl/kr');
				  break;
				case 'nz':
				 redirect('https://spideytracker.net/intl/nz');
				  break;
				case 'de':
				 redirect('https://spideytracker.net/intl/de');
				  break;
				case 'br':
				 redirect('https://spideytracker.net/intl/br');
				  break;
				case 'jp':
				 redirect('https://spideytracker.net/intl/jp');
				  break;
				case 'in':
				 redirect('https://spideytracker.net/intl/in');
				  break;
				case 'fr':
				 redirect('https://spideytracker.net/intl/fr');
				  break;
				case 'mx':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'cr':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'sv':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'gt':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'hn':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'ni':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'pa':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'ar':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'bo':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'cl':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'co':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'py':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'pe':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'uy':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'ec':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 've':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
				case 'do':
				 redirect('https://spideytracker.net/intl/latam');
				  break;
										
				default:
				 country_value = '';
				 
			  }
			
		     }
		 
		}
	};
	xhttp.open("GET", "https://d2i29m610w25go.cloudfront.net", true);
	xhttp.send();
