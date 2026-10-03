import { execSync } from 'child_process';
try {
  execSync('docker exec searxng sh -c "echo \'\' >> /etc/searxng/settings.yml"');
  execSync('docker exec searxng sh -c "echo \'search:\' >> /etc/searxng/settings.yml"');
  execSync('docker exec searxng sh -c "echo \'  formats:\' >> /etc/searxng/settings.yml"');
  execSync('docker exec searxng sh -c "echo \'    - html\' >> /etc/searxng/settings.yml"');
  execSync('docker exec searxng sh -c "echo \'    - json\' >> /etc/searxng/settings.yml"');
  execSync('docker restart searxng');
  console.log("Successfully updated SearXNG config");
} catch (e) {
  console.error(e.message);
}
