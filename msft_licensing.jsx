import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Switch } from "@/components/ui/switch";

const initialHosts = {
  Host1: {
    name: "Host1",
    cores: 48,
    vms: [
      { id: "vm1", cores: 4 },
      { id: "vm2", cores: 4 },
      { id: "vm3", cores: 4 },
      { id: "vm4", cores: 4 },
      { id: "vm5", cores: 4 },
      { id: "vm6", cores: 2 },
      { id: "vm7", cores: 8 },
      { id: "vm8", cores: 2 },
      { id: "vm9", cores: 4 },
      { id: "vm10", cores: 8 },
      { id: "vm11", cores: 16 },
    ],
  },
  Host2: {
    name: "Host2",
    cores: 64,
    vms: [
      { id: "vm12", cores: 8 },
      { id: "vm13", cores: 4 },
      { id: "vm14", cores: 8 },
      { id: "vm15", cores: 8 },
      { id: "vm16", cores: 8 },
      { id: "vm17", cores: 4 },
      { id: "vm18", cores: 4 },
      { id: "vm19", cores: 8 },
      { id: "vm20", cores: 8 },
      { id: "vm21", cores: 4 },
      { id: "vm22", cores: 4 },
    ],
  },
};

export default function App() {
  const [hosts, setHosts] = useState(initialHosts);
  const [licenses, setLicenses] = useState({
    standard: 0,
    datacenter: 0,
  });
  const [perVmMode, setPerVmMode] = useState(false);
  const [showVmCores, setShowVmCores] = useState(true);
  const [dragDisabled, setDragDisabled] = useState(false);

  const updateLicenses = () => {
    const standardLicenses = document.getElementById("standardLicenses").value;
    const datacenterLicenses = document.getElementById("datacenterLicenses").value;
    setLicenses({
      standard: parseInt(standardLicenses, 10) || 0,
      datacenter: parseInt(datacenterLicenses, 10) || 0,
    });
  };

  const calculateLicenses = (hosts, licenses, perVm) => {
    let totalCoresUsed = 0;
    const compliance = {};
    let remainingStandardLicenses = parseInt(licenses.standard);
    let remainingDatacenterLicenses = parseInt(licenses.datacenter);

    for (const key in hosts) {
      const host = hosts[key];
      const hostCoresRequired = host.cores;

      totalCoresUsed += hostCoresRequired;

      if (perVm) {
        let totalStandardUsed = 0;
        host.vms.forEach((vm) => {
          const stdNeeded = vm.cores;
          if (remainingStandardLicenses >= stdNeeded) {
            remainingStandardLicenses -= stdNeeded;
            totalStandardUsed += stdNeeded;
          }
        });
        compliance[key] = {
          datacenterUsed: 0,
          standardUsed: totalStandardUsed,
        };
      } else {
        const datacenterNeeded = hostCoresRequired; // Each core counts individually

        if (remainingDatacenterLicenses >= datacenterNeeded) {
          compliance[key] = {
            datacenterUsed: datacenterNeeded,
            standardUsed: 0,
          };
          remainingDatacenterLicenses -= datacenterNeeded;
        } else {
          const datacenterUsed = remainingDatacenterLicenses;
          const coresCoveredByDC = datacenterUsed;
          const uncoveredCores = Math.max(hostCoresRequired - coresCoveredByDC, 0);

          compliance[key] = {
            datacenterUsed,
            standardUsed: uncoveredCores,
          };

          remainingDatacenterLicenses = 0;
          remainingStandardLicenses -= uncoveredCores;
        }
      }
    }

    return {
      compliance,
      totalCoresUsed,
    };
  };

  const { compliance, totalCoresUsed } = calculateLicenses(hosts, licenses, perVmMode);

  const calculateCompliancePosition = () => {
    const totalCoresNeeded = totalCoresUsed;

    if (perVmMode) {
      const standardNeeded = Object.values(hosts).reduce(
        (acc, host) =>
          acc +
          host.vms.reduce((vmAcc, vm) => vmAcc + vm.cores, 0),
        0
      );
      return {
        datacenterGaps: 0,
        standardGaps: Math.max(standardNeeded - licenses.standard, 0),
      };
    } else {
      const datacenterNeeded = totalCoresUsed; // Cores needed individually
      const datacenterCoresCovered = licenses.datacenter;
      const remainingCores = Math.max(totalCoresUsed - datacenterCoresCovered, 0);
      const standardNeeded = remainingCores;

      return {
        datacenterGaps: Math.max(datacenterNeeded - datacenterCoresCovered, 0),
        standardGaps: Math.max(standardNeeded - licenses.standard, 0),
      };
    }
  };

  const { datacenterGaps, standardGaps } = calculateCompliancePosition();

  const onDragEnd = (result) => {
    if (!result.destination || dragDisabled) return;

    const sourceHost = result.source.droppableId;
    const destHost = result.destination.droppableId;

    // If source and destination are the same, no need to move anything
    if (sourceHost === destHost) return;

    const item = hosts[sourceHost].vms[result.source.index];

    // Create new arrays for VMs in both hosts
    const sourceVMs = [...hosts[sourceHost].vms];
    const destVMs = [...hosts[destHost].vms];

    // Remove item from source and add to destination
    sourceVMs.splice(result.source.index, 1);
    destVMs.splice(result.destination.index, 0, item);

    // Update the hosts with new VM lists
    setHosts({
      ...hosts,
      [sourceHost]: { ...hosts[sourceHost], vms: sourceVMs },
      [destHost]: { ...hosts[destHost], vms: destVMs },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="my-4 bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold mb-2">License Entitlements</h2>
        <div className="mb-2">
          <label className="block">Windows Server Datacenter Core Licenses</label>
          <input
            type="number"
            id="datacenterLicenses"
            value={licenses.datacenter}
            onChange={updateLicenses}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <p>{licenses.datacenter} cores</p>
        </div>
        <div>
          <label className="block">Windows Server Standard Core Licenses</label>
          <input
            type="number"
            id="standardLicenses"
            value={licenses.standard}
            onChange={updateLicenses}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <p>{licenses.standard} cores</p>
        </div>
      </div>

      <div className="my-4 bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold mb-2">Compliance Position</h2>
        <p className="text-lg">Datacenter Core Licenses Needed: {datacenterGaps}</p>
        <p className="text-lg">Standard Core Licenses Needed: {standardGaps}</p>
      </div>

      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Windows Server License Calculator</h1>
          <p className="text-lg mt-1">
            Total Cores Used: <span className="font-semibold">{totalCoresUsed}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Per-VM Mode</span>
            <Switch checked={perVmMode} onCheckedChange={(checked) => {
              setPerVmMode(checked);
              setDragDisabled(checked);
            }} />
          </div>
          <div className="flex items-center gap-2">
            <span>Show vCPU Counts</span>
            <Switch checked={showVmCores} onCheckedChange={setShowVmCores} />
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(hosts).map(([hostId, host]) => (
            <Droppable droppableId={hostId} key={hostId} isDropDisabled={dragDisabled}>
              {(provided) => (
                <div
                  className="bg-white rounded-2xl p-4 shadow"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h2 className="text-xl font-semibold mb-2">
                    {host.name} ({host.cores} cores)
                  </h2>
                  <p className="text-sm text-gray-600 mb-2">
                    Required Cores: {compliance[hostId]?.datacenterUsed || 0} Datacenter cores, {compliance[hostId]?.standardUsed || 0} Standard cores
                  </p>
                  <div className="space-y-2">
                    {host.vms.map((vm, index) => (
                      <Draggable draggableId={vm.id} index={index} key={vm.id} isDragDisabled={dragDisabled}>
                        {(provided) => (
                          <div
                            className="p-2 rounded-xl bg-blue-100 shadow"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {vm.id}{showVmCores && ` – ${vm.cores} cores`}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
