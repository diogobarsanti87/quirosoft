const { exec } = require('child_process');
const path = require('path');

// Caminho da pasta de backup e URL do Supabase
const backupFolder = `C:\\Users\\diogo\\Downloads\\2026-10-10T17_27Z.dir`;
const databaseUrl = "postgresql://postgres.utfqriycvgqaopyhjklu:K1m13K4n0@aws-0-us-east-1.pooler.supabase.com:5432/postgres";

console.log("Iniciando a restauração do backup no Supabase...");

// Usa o pg_restore via npx/node de forma simples
const command = `npx pg-restore --no-owner --no-acl --clean -d "${databaseUrl}" "${backupFolder}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro durante a restauração: ${error.message}`);
    return;
  }
  if (stderr) {
    console.log(`Avisos/Mensagens: ${stderr}`);
  }
  console.log(`Sucesso: ${stdout}`);
  console.log("Backup restaurado com sucesso no Supabase!");
});