<template>
  <!-- if prop variant is set to buttons then load template from Buttons.vue -->
  <span v-if="variant == 'buttons'" class="service-buttons-list">
    <!-- show serviceCountByStatus list -->
    <span
      v-for="item in serviceCountByStatus"
      :id="item.name"
      :key="item.name"
      class="menu-item service-button"
      :status="item.value"
      @click="OpenServices(item.value)"
    >
      <i class="pi pi-cog"></i>&nbsp;
      <span class="service-button-text">{{ item.count }}</span>
    </span>
    <!-- show list of services -->
    <!-- <span
      v-for="service in serviceList()"
      :id="service.id"
      :key="service.id"
      class="menu-item service-button"
      :status="service.status"
      @click="openSettings(service.id)"
    >
      <i :class="service.icon"></i>
    </span> -->
  </span>
  <!-- if prop variant is set to table then load template from Table.vue -->
  <span v-else-if="variant == 'table'">
    <label for="name">{{ $t("components.setting.services.status") }}</label>
    <div class="servicelist">
      <Dropdown
        v-model="selected"
        :options="serviceStatusList"
        option-label="name"
        option-value="value"
      >
      </Dropdown>
    </div>

    <Accordion :active-index="activeIndex">
      <AccordionTab v-for="service in listOfServices" :key="service.id">
        <template #header>
          <div class="service-header">
            <div>
              <i :class="service.icon"></i>
              <span class="service-title">{{ service.name }}</span>
            </div>
            <!-- button -->
            <div class="service-block">
              <span class="service-restart">
                <Button
                  :icon="`pi ${
                    loading === service.id ? 'pi-spin pi-refresh' : 'pi-refresh'
                  }`"
                  :style="{ 'pointer-events': loading ? 'none' : 'auto' }"
                  @click.stop="restartService(service)"
                />
              </span>

              <span class="service-status" :status="service.status"></span>
            </div>
          </div>
        </template>

        <div class="field">
          <label for="name">{{
            $t("components.setting.services.info.name")
          }}</label>
          <InputText id="name" v-model="service.name" type="text" />
        </div>
        <div class="field">
          <label for="enabled">{{
            $t("components.setting.services.info.enabled")
          }}</label>
          <Checkbox id="enabled" v-model="service.enabled" :binary="true" />
        </div>
        <div class="field">
          <label for="status">{{
            $t("components.setting.services.info.status")
          }}</label>
          <Dropdown
            id="status"
            v-model="service.status"
            :options="serviceStatusList"
            option-label="name"
            option-value="value"
          >
          </Dropdown>
        </div>
        <div class="field">
          <label for="serviceport">{{
            $t("components.setting.services.info.serviceport")
          }}</label>
          <InputText
            id="serviceport"
            v-model="service.serviceport"
            type="text"
          />
        </div>
        <div class="field">
          <label for="servicepid">{{
            $t("components.setting.services.info.servicepid")
          }}</label>
          <InputText id="servicepid" v-model="service.servicepid" type="text" />
        </div>
        <div class="field">
          <label for="type">{{
            $t("components.setting.services.info.type")
          }}</label>
          <Dropdown
            id="type"
            v-model="service.servicetype"
            :options="serviceTypeList"
            option-label="name"
            option-value="value"
          >
          </Dropdown>
        </div>
        <div class="field">
          <label for="description">{{
            $t("components.setting.services.info.description")
          }}</label>
          <Textarea
            id="description"
            v-model="service.description"
            rows="5"
            cols="30"
          />
        </div>
      </AccordionTab>
    </Accordion>
  </span>
</template>

<script>
  import { getModule } from "vuex-module-decorators"
  import Accordion from "primevue/accordion"
  import AccordionTab from "primevue/accordiontab"
  import Dropdown from "primevue/dropdown"
  import Checkbox from "primevue/checkbox"
  import InputText from "primevue/inputtext"
  import Textarea from "primevue/textarea"
  import Button from "primevue/button"
  import { errorToast, successToast } from "@/utils/toastService"
  import Settings from "@/store/Modules/Settings"
  import Services from "@/store/Modules/Services"
  const settingsModule = getModule(Settings)
  const servicesModule = getModule(Services)

  export default {
    name: "ServicesSettings",
    components: {
      Accordion,
      AccordionTab,
      Dropdown,
      Button,
      Checkbox,
      InputText,
      Textarea,
    },
    props: {
      variant: { type: String, default: "buttons" },
      field: { type: String, default: "" },
    },
    data() {
      return {
        loading: false,
        activeIndex: -1,
        selected: "ALL",
        listOfServices: [],
      }
    },
    computed: {
      serviceStatusColorList() {
        return servicesModule.serviceStatusColorList
      },
      serviceTypeList() {
        return servicesModule.serviceTypeList
      },
      serviceStatusList() {
        return servicesModule.serviceStatusList
      },
      serviceList() {
        return servicesModule.serviceList
      },
      serviceCountByStatus() {
        return servicesModule.serviceCountByStatus
      },
    },
    watch: {
      selected() {
        this.serviceListByStatus()
      },
    },
    created() {
      servicesModule.getServices()
    },
    mounted() {
      // //if global.asas === null
      // this.selected = globa.this.serviceListByStatus()
      if (servicesModule.data.selectedStatus) {
        this.selected = servicesModule.data.selectedStatus
      }
      this.serviceListByStatus()
      if (this.field) {
        const serviceIndex = servicesModule.serviceList.findIndex(
          (s) => s.id === this.field
        )
        this.activeIndex = serviceIndex
      } else {
        this.activeIndex = -1
      }
    },
    methods: {
      async restartService(service) {
        this.loading = service.id
        await servicesModule.restartService(service.id)
        this.serviceListByStatus()
        const newService = servicesModule.data.services.filter(
          (el) => el.id == service.id
        )
        const acceptedStatus = ["10", "120"]
        if (
          newService.length > 0 &&
          acceptedStatus.includes(newService[0].status)
        ) {
          this.loading = false
          successToast(this, "Successfully Started")
        } else {
          this.loading = false
          errorToast(this, "Something went wrong")
        }
      },
      OpenServices(status) {
        servicesModule.setSelectedServices(status)
        settingsModule.openSettingsDialog("services")
        // console.log("before", this.selected)
        // this.selected = status
        // console.log("after", this.selected)
        // this.preValueOfSelected = status
      },
      serviceListByStatus() {
        if (this.selected && this.selected === "ALL") {
          this.listOfServices = servicesModule.data.services
        } else {
          const data = servicesModule.data.services.filter(
            (el) => el.status == this.selected
          )
          this.listOfServices = data
        }
      },
    },
  }
</script>

<style lang="scss" scoped>
  span.service-buttons-list {
    display: inline-flex;
    margin-right: 2px;
    min-width: 50px;
    .menu-item {
      width: min-content;
    }
  }
  .servicelist {
    padding: 5px;
  }
  #service-panel {
    box-shadow: none;

    .p-panel-header {
      border: 1px solid var(--surface-border);
    }
    .p-panel-content {
      padding: 1rem;
      border: 1px solid var(--surface-border);
      border-top-width: 0;
    }
  }

  .service-header {
    vertical-align: top;
    width: 100%;
    display: flex;
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
  }
  .service-block {
    display: flex;
    align-items: center;
  }
  .service-title {
    padding-left: 1rem;
  }
  .service-restart {
    // padding-left: 1rem;
    margin-right: 1rem;
  }

  .service-status {
    margin-left: auto;
    margin-right: 1rem;
    height: 1rem;
    width: 1rem;
    padding-left: 1rem;
    background-color: gray;
    border-radius: 50%;
    display: inline-block;

    //TODO: turn this into a computed property
    &[status="-10"] {
      background-color: v-bind("serviceStatusColorList['error']");
    }
    &[status="-1"] {
      background-color: v-bind("serviceStatusColorList['error']");
    }
    &[status="0"] {
      background-color: v-bind("serviceStatusColorList['disabled']");
    }
    &[status="1"] {
      background-color: v-bind("serviceStatusColorList['available']");
    }
    &[status="10"] {
      background-color: v-bind("serviceStatusColorList['available']");
    }
    &[status="11"] {
      background-color: v-bind("serviceStatusColorList['available']");
    }
    &[status="14"] {
      background-color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="15"] {
      background-color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="20"] {
      background-color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="25"] {
      background-color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="30"] {
      background-color: v-bind("serviceStatusColorList['installed']");
    }
    &[status="50"] {
      background-color: v-bind("serviceStatusColorList['available']");
    }
    &[status="65"] {
      background-color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="70"] {
      background-color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="75"] {
      background-color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="80"] {
      background-color: v-bind("serviceStatusColorList['stopped']");
    }
    &[status="90"] {
      background-color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="100"] {
      background-color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="104"] {
      background-color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="105"] {
      background-color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="120"] {
      background-color: v-bind("serviceStatusColorList['started']");
    }
    &[status="200"] {
      background-color: v-bind("serviceStatusColorList['completedwerror']");
    }
    &[status="220"] {
      background-color: v-bind("serviceStatusColorList['completed']");
    }
  }

  .service-button {
    color: gray;

    //TODO: turn this into a computed property
    &[status="-10"] {
      color: v-bind("serviceStatusColorList['error']");
    }
    &[status="-1"] {
      color: v-bind("serviceStatusColorList['error']");
    }
    &[status="0"] {
      color: v-bind("serviceStatusColorList['disabled']");
    }
    &[status="1"] {
      color: v-bind("serviceStatusColorList['available']");
    }
    &[status="10"] {
      color: v-bind("serviceStatusColorList['available']");
    }
    &[status="11"] {
      color: v-bind("serviceStatusColorList['available']");
    }
    &[status="14"] {
      color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="15"] {
      color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="20"] {
      color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="25"] {
      color: v-bind("serviceStatusColorList['installing']");
    }
    &[status="30"] {
      color: v-bind("serviceStatusColorList['installed']");
    }
    &[status="50"] {
      color: v-bind("serviceStatusColorList['available']");
    }
    &[status="65"] {
      color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="70"] {
      color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="75"] {
      color: v-bind("serviceStatusColorList['stopping']");
    }
    &[status="80"] {
      color: v-bind("serviceStatusColorList['stopped']");
    }
    &[status="90"] {
      color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="100"] {
      color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="104"] {
      color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="105"] {
      color: v-bind("serviceStatusColorList['starting']");
    }
    &[status="120"] {
      color: v-bind("serviceStatusColorList['started']");
    }
    &[status="200"] {
      color: v-bind("serviceStatusColorList['completedwerror']");
    }
    &[status="220"] {
      color: v-bind("serviceStatusColorList['completed']");
    }
  }
</style>
