import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Отключаем StrictMode — предотвращает двойной маунт компонентов в dev-режиме,
  // что приводило к созданию лишних D-ID сессий и ошибке "Max user sessions reached"
  reactStrictMode: false,
};

export default nextConfig;
