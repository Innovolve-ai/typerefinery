<template>
  <div class="query-info-wrapperr">
    <div class="field">
      <label for="description">{{
        $t(`components.project.description`)
      }}</label>
      <Textarea
        id="description"
        :model-value="description"
        rows="3"
        cols="20"
        @input="handleInput($event, 'description')"
      />
    </div>

    <div class="field">
      <label for="icon">{{ $t(`components.project.icon`) }}</label>
      <InputText
        id="icon"
        :model-value="icon"
        @input="handleInput($event, 'icon')"
      />
    </div>

    <!-- <div class="field">
      <label>{{ $t(`components.transformer.transformer`) }}</label>
      <Dropdown
        :model-value="tranformer"
        :options="transformers"
        option-label="label"
        option-group-label="label"
        option-group-children="items"
        :placeholder="$t(`components.transformer.select`)"
        @change="handleTransformer($event)"
      />
    </div> -->
    <!-- <div class="field">
      <label>{{ $t(`components.tabquery.connection`) }}</label>
      <Dropdown
        :model-value="connection"
        :options="connections"
        option-label="label"
        option-group-label="label"
        option-group-children="items"
        :placeholder="$t(`components.tabquery.select`)"
        @change="handleConnection"
      />
    </div> -->
    <!-- <div class="field">
      <label for="database">{{ $t(`components.tabquery.db`) }}</label>
      <InputText
        id="database"
        :model-value="database"
        @input="handleInput($event, 'database')"
      />
    </div> -->
  </div>
</template>

<script>
  import { getModule } from "vuex-module-decorators"
  import InputText from "primevue/inputtext"
  import Dropdown from "primevue/dropdown"
  import Textarea from "primevue/textarea"
  import Projects from "@/store/Modules/Projects"
  import Connections from "@/store/Modules/Connections"
  // import Transformers from "@/store/Modules/Transformers"
  import Queries from "@/store/Modules/Queries"
  const projectsModule = getModule(Projects)
  const connectionsModule = getModule(Connections)
  const queriesModule = getModule(Queries)
  // const transformersModule = getModule(Transformers)
  export default {
    name: "QueryInfo",
    components: {
      InputText,
      //  Dropdown,
      Textarea,
    },
    props: {
      tab: { type: Object, required: true },
    },
    emits: ["on-input"],
    data() {
      return {
        debounce: null,
        icon: "",
        description: "",
      }
    },

    computed: {
      // description() {
      //   const { parent, id } = this.tab
      //   const projects = projectsModule.getProjects
      //   const projectIdx = projects.findIndex((el) => el.id === parent)
      //   const queries = projectsModule.getQueries(projectIdx)
      //   const queryIdx = queries.findIndex((el) => el.id === id)
      //   return projectsModule.getQuery(projectIdx, queryIdx).description
      // },

      // icon() {
      //   const { parent, id } = this.tab
      //   const projects = projectsModule.getProjects
      //   const projectIdx = projects.findIndex((el) => el.id === parent)
      //   const queries = projectsModule.getQueries(projectIdx)
      //   const queryIdx = queries.findIndex((el) => el.id === id)
      //   return projectsModule.getQuery(projectIdx, queryIdx).icon
      // },

      connections() {
        const { parent } = this.tab
        const projects = projectsModule.getProjects
        const projectIdx = projects.findIndex((el) => el.id === parent)
        return [
          {
            label: "Local",
            code: "local",
            items: projectsModule.getLocalConnections(projectIdx).map((el) => {
              return { label: el.label, key: el.id, scope: el.scope }
            }),
          },
          {
            label: "Global",
            code: "global",
            items: connectionsModule.getGlobalConnections.map((el) => {
              return { label: el.label, key: el.id, scope: el.scope }
            }),
          },
        ]
      },

      connection() {
        const { parent, id } = this.tab
        const projects = projectsModule.getProjects
        const projectIdx = projects.findIndex((el) => el.id === parent)
        const queries = projectsModule.getQueries(projectIdx)
        const queryIdx = queries.findIndex((el) => el.id === id)
        const connectionid = projectsModule.getQuery(
          projectIdx,
          queryIdx
        ).connectionid
        const connection = projectsModule
          .getLocalConnections(projectIdx)
          .find((el) => el.id === connectionid)
        return {
          key: connection.id,
          label: connection.label,
          scope: connection.scope,
        }
      },

      // tranformer() {
      //   const { projectIdx: pI, queryIdx: qI } = this.tab
      //   const transformer = projectsModule.getQuery(pI, qI).transformer
      //   return {
      //     key: transformer.id,
      //     label: transformer.label,
      //     scope: transformer.scope,
      //   }
      // },

      // transformers() {
      //   const { projectIdx } = this.tab
      //   return [
      //     {
      //       label: "Local",
      //       code: "local",
      //       items: projectsModule.getLocalTransformers(projectIdx).map((el) => {
      //         return { label: el.label, key: el.id, scope: el.scope }
      //       }),
      //     },
      //     {
      //       label: "Global",
      //       code: "global",
      //       items: transformersModule.getGlobalTransformers.map((el) => {
      //         return { label: el.label, key: el.id, scope: el.scope }
      //       }),
      //     },
      //   ]
      // },

      // database() {
      //   const { projectIdx, queryIdx } = this.tab
      //   return projectsModule.getQuery(projectIdx, queryIdx).database
      // },
    },
    mounted() {
      this.setInitialData()
    },
    methods: {
      setInitialData() {
        const { parent, id } = this.tab
        const projects = projectsModule.getProjects
        const projectIdx = projects.findIndex((el) => el.id === parent)
        let queryData
        if (projectIdx != -1) {
          // local
          const queries = projectsModule.getQueries(projectIdx)
          const queryIdx = queries.findIndex((el) => el.id === id)
          queryData = queries[queryIdx]
          // const project = projectsModule.getProjects[projectIdx]
          // connection = project.connections.list[connectionIdx]
        } else {
          // global
          const queries = queriesModule.getGlobalQueries
          const queryIdx = queries.findIndex((el) => el.id === id)
          queryData = queriesModule.data.list[queryIdx]
        }
        // const { theme } = themeData
        // this.code = theme
        const { description, icon } = queryData
        this.description = description
        this.icon = icon
      },
      handleInput({ target: { value } }, field) {
        this.$emit("on-input", field, value)
        // const payload = { field, value, ...this.tab }
        // projectsModule.setQueryData(payload)
        // clearTimeout(this.debounce)
        // this.debounce = setTimeout(async () => {
        //   const { parent, id } = this.tab
        //   const projects = projectsModule.getProjects
        //   const projectIdx = projects.findIndex((el) => el.id === parent)
        //   if (projectIdx != -1) {
        //     const queries = projectsModule.getQueries(projectIdx)
        //     const queryIdx = queries.findIndex((el) => el.id === id)
        //     const payload = { field, value, queryIdx, ...this.tab }
        //     await projectsModule.setQueryData(payload)
        //   } else {
        //     // global
        //     const queries = queriesModule.getGlobalQueries
        //     const queryIdx = queries.findIndex((el) => el.id === id)
        //     const payload = { field, value, queryIdx, ...this.tab }
        //     await queriesModule.setGlobalQuery(payload)
        //   }
        // }, 500)
      },

      // handleTransformer({ value }) {
      //   let transformer
      //   if (value.scope == "local") {
      //     transformer = projectsModule
      //       .getLocalTransformers(this.tab.projectIdx)
      //       .find((el) => el.id == value.key)
      //   } else {
      //     transformer = transformersModule.getGlobalTransformers.find(
      //       (el) => el.id == value.key
      //     )
      //   }
      //   const payload = { key: "transformer", value: transformer, ...this.tab }
      //   projectsModule.updateQuery(payload)
      // },

      handleConnection({ value }) {
        const { parent } = this.tab
        const projects = projectsModule.getProjects
        const projectIdx = projects.findIndex((el) => el.id === parent)
        let connection
        if (value.scope == "local") {
          connection = projectsModule
            .getLocalConnections(projectIdx)
            .find((el) => el.id == value.key)
        } else {
          connection = connectionsModule.getGlobalConnections.find(
            (el) => el.id == value.key
          )
        }
        const payload = {
          field: "connectionid",
          value: connection.id,
          ...this.tab,
        }
        projectsModule.setQueryData(payload)
      },
    },
  }
</script>

<style lang="scss">
  .query-info-wrapperr {
    margin: 1rem;

    input,
    textarea,
    .p-inputwrapper {
      width: 100%;
    }
  }
</style>
