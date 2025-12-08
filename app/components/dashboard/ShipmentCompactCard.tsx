// app/dashboard/page.tsx (aggiorna solo le card KPI)
<div className="col-span-12 lg:col-span-3 space-y-4">
  {/* Card trasparenti stile vetro */}
  <motion.div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/30">
    <KPICardWithRefresh
      title="Evasi Oggi"
      icon={CheckCircle}
      color="green"
      apiEndpoint="/api/kpi/store2"
      valueKey="ordersFulfilledToday"
      refreshInterval={60000}
    />
  </motion.div>
  
  <motion.div className="bg-white/40 backdrop-blur-2xl rounded-3xl p-5 shadow-xl border border-white/30">
    <KPICardWithRefresh
      title="Incasso Oggi"
      icon={Euro}
      color="purple"
      apiEndpoint="/api/kpi/store2"
      valueKey="revenueToday"
      suffix=" €"
      refreshInterval={60000}
    />
  </motion.div>
</div>


