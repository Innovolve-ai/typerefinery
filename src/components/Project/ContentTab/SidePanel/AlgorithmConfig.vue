<template>
  <div class="config-container">
    <div class="config-container-head">
      <Button
        :label="$t(`components.graph.config`)"
        class="p-button-raised"
        :class="{
          'p-button-text p-button-plain': activeView !== 'config',
        }"
        @click="handleView('config')"
      />
      <Button
        :label="$t(`components.graph.help`)"
        class="p-button-raised"
        :class="{
          'p-button-text p-button-plain': activeView !== 'help',
        }"
        @click="handleView('help')"
      />
    </div>
    <div class="config-container-content">
      <div v-if="activeView === 'config'">
        <div class="field">
          <label>{{ $t(`components.transformer.dependencies`) }}</label>
          <Textarea
            :model-value="dependencies"
            rows="3"
            cols="30"
            @input="handleDependencies"
          />
        </div>
        <div class="field">
          <label>{{ $t(`components.algorithm.label`) }}</label>
          <Dropdown
            :model-value="algorithm"
            :options="algorithms"
            option-label="label"
            option-group-label="label"
            option-group-children="items"
            :placeholder="$t(`components.algorithm.select`)"
            @change="showConfirmDialog"
          />
        </div>
        <div class="field">
          <Button
            :label="$t(`components.algorithm.buttons.save-as`)"
            class="p-button-raised p-button-info"
            @click="saveDialog = true"
          />
        </div>
        <Dialog
          v-model:visible="saveDialog"
          modal
          class="save-tranformer-dialog"
          :header="$t(`components.algorithm.save`)"
          :style="{ width: '400px' }"
        >
          <div class="dialog-content">
            <span class="p-float-label">
              <InputText id="name" v-model="algorithmName" type="text" />
              <label for="name">{{ $t(`components.algorithm.name`) }}</label>
            </span>
            <Button
              class="p-button-raised mr-2"
              :disabled="!algorithmName.length"
              :label="$t(`components.algorithm.buttons.save-as-global`)"
              @click="saveAlgorithm('global')"
            />
            <Button
              class="p-button-raised p-button-success"
              :disabled="!algorithmName.length"
              :label="$t(`components.algorithm.buttons.save-as-local`)"
              @click="saveAlgorithm('local')"
            />
          </div>
          <template #footer>
            <Button
              :label="$t(`components.algorithm.buttons.cancel`)"
              icon="pi pi-times"
              class="p-button-text"
              @click="saveDialog = false"
            />
          </template>
        </Dialog>
      </div>
    </div>
  </div>
</template>

<script>
  import { getModule } from "vuex-module-decorators"
  import { getRandomId } from "@/utils"
  import Button from "primevue/button"
  import Dropdown from "primevue/dropdown"
  import Dialog from "primevue/dialog"
  import InputText from "primevue/inputtext"
  import Textarea from "primevue/textarea"
  import Projects from "@/store/Modules/Projects"
  import Algorithms from "@/store/Modules/Algorithms"
  const projectsModule = getModule(Projects)
  const algorithmsModule = getModule(Algorithms)

  export default {
    name: "AlgorithmConfig",
    components: {
      Button,
      Dropdown,
      Dialog,
      InputText,
      Textarea,
    },
    props: {
      tab: { type: Object, required: true },
    },
    data() {
      return {
        algorithmName: "",
        activeView: "config",
        saveDialog: false,
        selectedAlgorithm: null,
      }
    },
    computed: {
      algorithm() {
        const { projectIdx: pI, queryIdx: qI } = this.tab
        const algorithm = projectsModule.getQuery(pI, qI).algorithm
        return {
          key: algorithm.id,
          label: algorithm.label,
          scope: algorithm.scope,
        }
      },
      algorithms() {
        const { projectIdx } = this.tab
        return [
          {
            label: "Local",
            code: "local",
            items: projectsModule.getLocalAlgorithms(projectIdx).map((el) => {
              return { label: el.label, key: el.id, scope: el.scope }
            }),
          },
          {
            label: "Global",
            code: "global",
            items: algorithmsModule.getGlobalAlgorithms.map((el) => {
              return { label: el.label, key: el.id, scope: el.scope }
            }),
          },
        ]
      },
      dependencies() {
        const { projectIdx: pI, queryIdx: qI } = this.tab
        const algorithm = projectsModule.getQuery(pI, qI).algorithm
        return algorithm.dependencies
      },
    },
    methods: {
      handleView(view) {
        this.activeView = view
      },
      showConfirmDialog(el) {
        this.$confirm.require({
          message: this.$t("components.algorithm.confirm-msg"),
          header: this.$t("components.transformer.sure"),
          acceptLabel: this.$t("components.algorithm.buttons.yes"),
          rejectLabel: this.$t("components.algorithm.buttons.no"),
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            this.setAlgorithmCode(el.value)
          },
          reject: () => {
            this.$confirm.close()
          },
        })
      },
      setAlgorithmCode(value) {
        let algorithm
        const { projectIdx } = this.tab
        if (value.scope == "local") {
          algorithm = projectsModule
            .getLocalAlgorithms(projectIdx)
            .find((el) => el.id == value.key)
        } else {
          algorithm = algorithmsModule.getGlobalAlgorithms.find((el) => {
            return el.id == value.key
          })
        }
        const payload = { field: "algorithm", value: algorithm, ...this.tab }
        projectsModule.updateQuery(payload)
      },
      saveAlgorithm(scope) {
        this.saveDialog = false
        const { projectIdx: pI, queryIdx: qI } = this.tab
        const algorithm = projectsModule.getQuery(pI, qI).algorithm
        let data = {
          data: {
            ...algorithm,
            id: getRandomId(),
            label: this.algorithmName,
          },
        }
        if (scope == "local") {
          data.projectIdx = this.tab.projectIdx
          data.data.scope = "local"
          projectsModule.addLocalAlgorithm(data)
        } else {
          data.data.scope = "global"
          algorithmsModule.addGlobalAlgorithm(data)
        }
        this.algorithmName = ""
      },
      handleDependencies(e) {
        const { projectIdx, queryIdx } = this.tab
        const query = projectsModule.getQuery(projectIdx, queryIdx)
        const algorithm = { ...query.algorithm }
        algorithm.dependencies = e.target.value
        const payload = { field: "algorithm", value: algorithm, ...this.tab }
        projectsModule.updateQuery(payload)
      },
    },
  }
</script>

<style lang="scss">
  .config-container {
    &-head {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      border-bottom: 1px solid var(--surface-border);
      flex-flow: wrap;

      button {
        margin-right: 5px;
      }
    }
    &-content {
      display: block;
      margin: 1rem;

      .field {
        label {
          display: block;
        }
        textarea {
          width: 100%;
        }
      }

      .help {
        display: flex;
        align-items: center;
        border: 1px solid var(--surface-border);
        border-radius: 4px;

        code {
          font-weight: bold;
          border-right: 1px solid var(--surface-border);
          padding: 8px 16px;
          color: var(--text-color);
          font-size: 12px;
        }

        span {
          flex: 1;
          padding: 8px;
          text-align: center;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .p-multiselect,
      .p-dropdown {
        max-width: 100%;
        width: 100%;
      }
    }
  }

  div.save-tranformer-dialog.p-dialog {
    .p-dialog-content {
      padding-top: 10px;
      padding-bottom: 0.5rem;

      input {
        width: 100%;
      }
    }
  }
</style>
iruezn iruezn
