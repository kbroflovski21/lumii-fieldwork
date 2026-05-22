import { statusText } from "./contracts";
import { WorkAreaLayout } from "./WorkAreaLayout";
import type { ServiceObject, ServiceObjectsResponse } from "./contracts";
import type { Resource } from "./useSiteOperationsData";

export function HealthProfilesArea({ resource }: { resource: Resource<ServiceObjectsResponse> }) {
  return (
    <WorkAreaLayout
      description="长者健康情况、照护重点和家属订阅"
      filters={["全部", "有风险", "已订阅"]}
      searchLabel="搜索健康档案"
      searchPlaceholder="搜索长者"
      title="健康档案"
    >
      {resource.status === "loading" || resource.status === "idle" ? <div className="site-empty-state">健康档案数据加载中</div> : null}
      {resource.status === "error" ? <div className="site-empty-state">{resource.error}</div> : null}
      {resource.status === "success" ? <HealthProfilesContent data={resource.data} /> : null}
    </WorkAreaLayout>
  );
}

function HealthProfilesContent({ data }: { data: ServiceObjectsResponse }) {
  if (data.serviceObjects.length === 0) {
    return <div className="site-empty-state">暂无健康档案</div>;
  }

  const selectedProfile = data.serviceObjects[0];

  return (
    <div className="site-health">
      <HealthProfileList profiles={data.serviceObjects} />
      <HealthProfileDetail profile={selectedProfile} />
    </div>
  );
}

function HealthProfileList({ profiles }: { profiles: ServiceObject[] }) {
  return (
    <div className="site-table" role="table">
      <div className="site-table__head site-table__head--health" role="row">
        {["长者", "保障类型", "服务频次", "服务项目", "风险标签", "家属订阅"].map((column) => (
          <span key={column} role="columnheader">
            {column}
          </span>
        ))}
      </div>
      {profiles.map((profile) => (
        <div className="site-table__row site-table__row--health" key={profile.id} role="row">
          <div role="cell">
            <span className="site-primary-line">
              <strong>{profile.name}</strong>
              <small>{profile.age} 岁</small>
            </span>
          </div>
          <div role="cell">{profile.eligibilityType}</div>
          <div role="cell">{profile.serviceFrequency}</div>
          <div role="cell">{profile.serviceProjects.join(" / ")}</div>
          <div role="cell">{profile.riskTags.length > 0 ? profile.riskTags.join(" / ") : "无"}</div>
          <div role="cell">
            <span className="site-status" data-tone={hasSubscribedFamily(profile) ? "success" : "warning"}>
              {hasSubscribedFamily(profile) ? "已订阅" : "未订阅"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthProfileDetail({ profile }: { profile: ServiceObject }) {
  return (
    <section aria-label="健康档案详情" className="site-detail">
      <header>
        <div>
          <h3>{profile.name} 健康档案</h3>
          <p>{profile.address}</p>
        </div>
        <button className="site-row-action" type="button">
          编辑档案
        </button>
      </header>

      <div className="site-detail__grid">
        <article>
          <h4>照护重点</h4>
          {profile.careNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </article>
        <article>
          <h4>服务配置</h4>
          <p>{profile.serviceFrequency}</p>
          <p>{profile.serviceProjects.join(" / ")}</p>
        </article>
        <article>
          <h4>风险标签</h4>
          <p>{profile.riskTags.length > 0 ? profile.riskTags.join(" / ") : "无风险标签"}</p>
        </article>
        <article>
          <h4>家属联系人</h4>
          {profile.familyContacts.map((contact) => (
            <p key={contact.id}>
              <strong>{contact.name}</strong>
              <span>
                {contact.relation} · {contact.phone}
              </span>
            </p>
          ))}
        </article>
        <article>
          <h4>推送订阅</h4>
          {profile.familyContacts.map((contact) => (
            <p key={contact.id}>
              <strong>{statusText[contact.subscriptionStatus]}</strong>
              <span>{contact.lastPushedAt ? `最近推送 ${contact.lastPushedAt}` : "暂无推送记录"}</span>
            </p>
          ))}
        </article>
      </div>
    </section>
  );
}

function hasSubscribedFamily(profile: ServiceObject) {
  return profile.familyContacts.some((contact) => contact.subscriptionStatus !== "none");
}
